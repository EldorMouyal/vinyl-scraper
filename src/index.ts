import * as cron from 'node-cron';
import * as winston from 'winston';
import { DatabaseService } from './services/database/DatabaseService';
import { DiscogsService } from './services/discogs/DiscogsService';
import { TelegramNotificationService } from './services/telegram/TelegramBot';
import { VinylListing } from './models/VinylListing';
import { UserPreferences } from './models/UserPreferences';
import { normalizeString } from './utils/stringNormalizer';
import * as fs from 'fs';
import * as path from 'path';

interface Config {
  discogs: {
    userAgent: string;
    token: string;
  };
  telegram: {
    botToken: string;
    chatId: string;
  };
  preferences: UserPreferences;
  scraping: {
    intervalHours: number;
    maxRetries: number;
    delayBetweenRequests: number;
  };
}

class VinylScraper {
  private db!: DatabaseService;
  private discogs!: DiscogsService;
  private telegram!: TelegramNotificationService;
  private config!: Config;
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ],
    });

    this.loadConfig();
    this.db = new DatabaseService();
    this.discogs = new DiscogsService(this.config.discogs.userAgent, this.config.discogs.token);
    this.telegram = new TelegramNotificationService(this.config.telegram.botToken, this.config.telegram.chatId);
  }

  private loadConfig(): void {
    try {
      const configPath = path.join(process.cwd(), 'src', 'config', 'preferences.json');
      const configFile = fs.readFileSync(configPath, 'utf8');
      this.config = JSON.parse(configFile);

      if (!this.config.telegram.botToken || !this.config.telegram.chatId) {
        throw new Error('Telegram bot token and chat ID must be configured');
      }
    } catch (error) {
      this.logger.error('Failed to load configuration:', error);
      throw error;
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.db.initialize();
      this.logger.info('Database initialized');

      const telegramConnected = await this.telegram.testConnection();
      if (!telegramConnected) {
        throw new Error('Failed to connect to Telegram');
      }
      this.logger.info('Telegram connection verified');

      await this.seedUserPreferences();
      this.logger.info('Vinyl scraper initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize vinyl scraper:', error);
      throw error;
    }
  }

  private async seedUserPreferences(): Promise<void> {
    const existingPrefs = await this.db.getUserPreferences();
    if (existingPrefs.length > 0) return;

    for (const artist of this.config.preferences.artists) {
      await this.db.addUserPreference('artist', artist);
    }

    for (const genre of this.config.preferences.genres) {
      await this.db.addUserPreference('genre', genre);
    }

    for (const album of this.config.preferences.albums) {
      await this.db.addUserPreference('album', album);
    }
  }

  async scrapeVinyl(): Promise<void> {
    this.logger.info('Starting vinyl scraping session');

    try {
      const preferences = await this.db.getUserPreferences();
      const artistPrefs = preferences.filter(p => p.type === 'artist');
      const newListings: VinylListing[] = [];

      for (const artistPref of artistPrefs) {
        try {
          this.logger.info(`Searching for artist: ${artistPref.value}`);
          const listings = await this.discogs.searchForArtist(artistPref.value);

          for (const listing of listings) {
            if (await this.isRelevantListing(listing, preferences)) {
              const existingListing = await this.db.getExistingListing(listing.uniqueKey);

              if (!existingListing) {
                await this.db.insertListing(listing);
                await this.db.addPriceHistory({
                  listingId: listing.id,
                  price: listing.price,
                  dateRecorded: new Date(),
                });
                newListings.push(listing);
                this.logger.info(`New listing found: ${listing.artistDisplay} - ${listing.titleDisplay}`);
              } else {
                await this.db.updateListingLastSeen(listing.uniqueKey);

                if (existingListing.price !== listing.price) {
                  await this.db.addPriceHistory({
                    listingId: existingListing.id,
                    price: listing.price,
                    dateRecorded: new Date(),
                  });
                }
              }
            }
          }

          await this.delay(this.config.scraping.delayBetweenRequests);
        } catch (error) {
          this.logger.error(`Error scraping artist ${artistPref.value}:`, error);
          await this.telegram.sendErrorNotification(
            `Failed to scrape artist: ${artistPref.value}`,
            'discogs'
          );
        }
      }

      if (newListings.length > 0) {
        await this.telegram.sendBatchNotification(newListings);
        this.logger.info(`Sent notifications for ${newListings.length} new listings`);
      }

      this.logger.info(`Scraping session completed. Found ${newListings.length} new listings.`);
    } catch (error) {
      this.logger.error('Error during scraping session:', error);
      await this.telegram.sendErrorNotification(
        'General scraping error occurred',
        'system'
      );
    }
  }

  private async isRelevantListing(listing: VinylListing, preferences: any[]): Promise<boolean> {
    const normalizedArtist = normalizeString(listing.artist);
    const normalizedTitle = normalizeString(listing.title);

    const artistMatches = preferences
      .filter(p => p.type === 'artist')
      .some(p => normalizedArtist.includes(normalizeString(p.value)));

    const albumMatches = preferences
      .filter(p => p.type === 'album')
      .some(p => normalizedTitle.includes(normalizeString(p.value)));

    return artistMatches || albumMatches;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  startScheduler(): void {
    const cronExpression = `0 */${this.config.scraping.intervalHours} * * *`;

    cron.schedule(cronExpression, async () => {
      this.logger.info('Scheduled scraping session starting');
      await this.scrapeVinyl();
    });

    this.logger.info(`Scheduler started. Will run every ${this.config.scraping.intervalHours} hours.`);
  }

  async runOnce(): Promise<void> {
    await this.scrapeVinyl();
  }

  async shutdown(): Promise<void> {
    await this.db.close();
    this.logger.info('Vinyl scraper shut down');
  }
}

async function main() {
  const scraper = new VinylScraper();

  try {
    await scraper.initialize();

    const args = process.argv.slice(2);
    if (args.includes('--once')) {
      await scraper.runOnce();
      await scraper.shutdown();
    } else {
      scraper.startScheduler();
      await scraper.runOnce();

      process.on('SIGINT', async () => {
        console.log('\nShutting down gracefully...');
        await scraper.shutdown();
        process.exit(0);
      });
    }
  } catch (error) {
    console.error('Failed to start vinyl scraper:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}