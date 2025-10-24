import TelegramBot from 'node-telegram-bot-api';
import { VinylListing } from '../../models/VinylListing';

export class TelegramNotificationService {
  private bot: TelegramBot;
  private chatId: string;

  constructor(token: string, chatId: string) {
    this.bot = new TelegramBot(token, { polling: false });
    this.chatId = chatId;
  }

  async sendNewListingNotification(listing: VinylListing): Promise<void> {
    try {
      const message = this.formatListingMessage(listing);
      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
      throw error;
    }
  }

  async sendErrorNotification(error: string, source: string): Promise<void> {
    try {
      const message = `❌ <b>Scraping Error</b>\n\n` +
        `🔗 <b>Source:</b> ${source}\n` +
        `⚠️ <b>Error:</b> ${error}\n\n` +
        `⏰ Will retry in next scraping session.`;

      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
    } catch (telegramError) {
      console.error('Failed to send error notification:', telegramError);
    }
  }

  async sendBatchNotification(listings: VinylListing[]): Promise<void> {
    if (listings.length === 0) return;

    try {
      if (listings.length === 1) {
        await this.sendNewListingNotification(listings[0]);
        return;
      }

      const header = `🎵 <b>${listings.length} New Vinyl Listings Found!</b>\n\n`;
      let message = header;

      for (const listing of listings.slice(0, 10)) {
        const listingText = this.formatListingMessage(listing, true);

        if ((message + listingText).length > 4000) {
          await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
          message = header + listingText;
        } else {
          message += listingText + '\n━━━━━━━━━━━━━━━━━━━━━\n\n';
        }
      }

      if (listings.length > 10) {
        message += `... and ${listings.length - 10} more listings`;
      }

      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Failed to send batch notification:', error);
      throw error;
    }
  }

  private formatListingMessage(listing: VinylListing, compact: boolean = false): string {
    const shippingText = listing.shippingFee
      ? `${listing.shippingFee} ${listing.currency}`
      : 'Unknown';

    if (compact) {
      return `🎵 <b>${listing.artistDisplay}</b> - ${listing.titleDisplay}\n` +
        `💰 ${listing.price} ${listing.currency} | 📦 +${shippingText}\n` +
        `📀 ${listing.condition} | 🏪 ${listing.sellerDisplay}\n` +
        `🔗 <a href="${listing.url}">View Listing</a>`;
    }

    return `🎵 <b>New Vinyl Found!</b>\n\n` +
      `🎤 <b>Artist:</b> ${listing.artistDisplay}\n` +
      `💿 <b>Album:</b> ${listing.titleDisplay}\n` +
      `💰 <b>Price:</b> ${listing.price} ${listing.currency}\n` +
      `📦 <b>Shipping:</b> ${shippingText}\n` +
      `📀 <b>Condition:</b> ${listing.condition}\n` +
      `🏪 <b>Seller:</b> ${listing.sellerDisplay}\n` +
      `🌐 <b>Source:</b> ${listing.source.charAt(0).toUpperCase() + listing.source.slice(1)}\n\n` +
      `🔗 <a href="${listing.url}">View Listing</a>`;
  }

  async testConnection(): Promise<boolean> {
    try {
      const me = await this.bot.getMe();
      console.log(`Connected to Telegram bot: ${me.username}`);
      return true;
    } catch (error) {
      console.error('Failed to connect to Telegram:', error);
      return false;
    }
  }
}