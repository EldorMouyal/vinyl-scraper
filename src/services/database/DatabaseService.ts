import knex, { Knex } from 'knex';
import { VinylListing, PriceHistory } from '../../models/VinylListing';
import { UserPreferenceRecord } from '../../models/UserPreferences';

export class DatabaseService {
  private db: Knex;

  constructor(dbPath: string = './vinyl_scraper.db') {
    this.db = knex({
      client: 'sqlite3',
      connection: {
        filename: dbPath,
      },
      useNullAsDefault: true,
    });
  }

  async initialize(): Promise<void> {
    await this.createTables();
  }

  private async createTables(): Promise<void> {
    // Create vinyl_listings table
    await this.db.schema.hasTable('vinyl_listings').then((exists) => {
      if (!exists) {
        return this.db.schema.createTable('vinyl_listings', (table) => {
          table.string('id').primary();
          table.string('title').notNullable();
          table.string('title_display').notNullable();
          table.string('artist').notNullable();
          table.string('artist_display').notNullable();
          table.decimal('price', 10, 2).notNullable();
          table.string('currency').notNullable();
          table.string('condition').notNullable();
          table.decimal('shipping_fee', 10, 2).nullable();
          table.string('seller').notNullable();
          table.string('seller_display').notNullable();
          table.string('url').notNullable();
          table.string('source').notNullable();
          table.datetime('date_found').notNullable();
          table.datetime('last_seen').notNullable();
          table.boolean('ships_to_israel').notNullable();
          table.string('unique_key').unique().notNullable();
          table.boolean('is_active').defaultTo(true);
          table.index(['artist', 'title']);
          table.index(['unique_key']);
        });
      }
    });

    // Create price_history table
    await this.db.schema.hasTable('price_history').then((exists) => {
      if (!exists) {
        return this.db.schema.createTable('price_history', (table) => {
          table.increments('id').primary();
          table.string('listing_id').references('id').inTable('vinyl_listings');
          table.decimal('price', 10, 2).notNullable();
          table.datetime('date_recorded').notNullable();
          table.index(['listing_id']);
        });
      }
    });

    // Create user_preferences table
    await this.db.schema.hasTable('user_preferences').then((exists) => {
      if (!exists) {
        return this.db.schema.createTable('user_preferences', (table) => {
          table.increments('id').primary();
          table.string('type').notNullable();
          table.string('value').notNullable();
          table.datetime('created_at').defaultTo(this.db.fn.now());
          table.index(['type', 'value']);
        });
      }
    });
  }

  async insertListing(listing: VinylListing): Promise<void> {
    await this.db('vinyl_listings').insert({
      id: listing.id,
      title: listing.title,
      title_display: listing.titleDisplay,
      artist: listing.artist,
      artist_display: listing.artistDisplay,
      price: listing.price,
      currency: listing.currency,
      condition: listing.condition,
      shipping_fee: listing.shippingFee,
      seller: listing.seller,
      seller_display: listing.sellerDisplay,
      url: listing.url,
      source: listing.source,
      date_found: listing.dateFound,
      last_seen: listing.lastSeen,
      ships_to_israel: listing.isShipsToIsrael,
      unique_key: listing.uniqueKey,
      is_active: listing.isActive,
    });
  }

  async updateListingLastSeen(uniqueKey: string): Promise<void> {
    await this.db('vinyl_listings')
      .where('unique_key', uniqueKey)
      .update({
        last_seen: new Date(),
        is_active: true,
      });
  }

  async markInactiveListings(activeUniqueKeys: string[]): Promise<void> {
    await this.db('vinyl_listings')
      .whereNotIn('unique_key', activeUniqueKeys)
      .update({ is_active: false });
  }

  async getExistingListing(uniqueKey: string): Promise<VinylListing | null> {
    const row = await this.db('vinyl_listings')
      .where('unique_key', uniqueKey)
      .first();

    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      titleDisplay: row.title_display,
      artist: row.artist,
      artistDisplay: row.artist_display,
      price: parseFloat(row.price),
      currency: row.currency,
      condition: row.condition,
      shippingFee: row.shipping_fee ? parseFloat(row.shipping_fee) : undefined,
      seller: row.seller,
      sellerDisplay: row.seller_display,
      url: row.url,
      source: row.source,
      dateFound: new Date(row.date_found),
      lastSeen: new Date(row.last_seen),
      isShipsToIsrael: Boolean(row.ships_to_israel),
      uniqueKey: row.unique_key,
      isActive: Boolean(row.is_active),
    };
  }

  async addPriceHistory(priceHistory: PriceHistory): Promise<void> {
    await this.db('price_history').insert({
      listing_id: priceHistory.listingId,
      price: priceHistory.price,
      date_recorded: priceHistory.dateRecorded,
    });
  }

  async getUserPreferences(): Promise<UserPreferenceRecord[]> {
    const rows = await this.db('user_preferences').select('*');
    return rows.map(row => ({
      id: row.id,
      type: row.type,
      value: row.value,
      createdAt: new Date(row.created_at),
    }));
  }

  async addUserPreference(type: 'artist' | 'genre' | 'album', value: string): Promise<void> {
    await this.db('user_preferences').insert({
      type,
      value: value.toLowerCase().trim(),
      created_at: new Date(),
    });
  }

  async close(): Promise<void> {
    await this.db.destroy();
  }
}