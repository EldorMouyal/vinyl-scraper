# 🎵 Vinyl Scraper

A TypeScript application that monitors vinyl record listings from Discogs (and future sites) and sends notifications via Telegram when new listings match your interests.

## ✨ Features

- 🎵 **Smart Vinyl Monitoring** - Searches Discogs for vinyl records matching your preferences
- 📱 **Telegram Notifications** - Instant alerts with price, condition, shipping info, and direct links
- 💾 **Price Tracking** - SQLite database tracks listings and price history over time
- ⏰ **Automated Scheduling** - Runs every 12 hours automatically (configurable)
- 🔍 **Custom Filtering** - Filter by artists, genres, and specific albums
- 🌍 **International Shipping** - Only shows listings that ship to your location
- 📊 **Historical Data** - Track price changes and market trends
- 🔧 **Extensible Design** - Easy to add support for other vinyl marketplace sites

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/vinyl-scraper.git
cd vinyl-scraper
npm install
```

### 2. Quick Setup (Recommended)

Run the interactive setup script:

```bash
npm run setup
```

This will guide you through configuring your Telegram bot, Discogs API, and music preferences.

**OR** follow the manual setup below:

### 3. Set Up Telegram Bot (Manual Setup)

#### Step 3.1: Create Your Bot
1. Open Telegram and search for **@BotFather**
2. Start a conversation and send `/newbot`
3. Follow the prompts:
   - **Bot name**: `Your Vinyl Listener` (or any name you like)
   - **Username**: `YourVinylListener_bot` (must end in `_bot`)
4. **Save the token** - BotFather will give you a token like: `1234567890:ABCdefGHIjklMNOPqrsTUVwxyz`

#### Step 3.2: Get Your Chat ID
1. Message your new bot first (search for the username you created)
2. Send any message to your bot (like "Hello")
3. Now message **@userinfobot** on Telegram
4. **Save your Chat ID** - It will show something like `Id: 123456789`

### 4. Get Discogs API Access (Manual Setup)

#### Step 4.1: Create Discogs Account
1. Sign up at [Discogs.com](https://www.discogs.com) if you don't have an account

#### Step 4.2: Create API Application
1. Go to [Discogs Developer Settings](https://www.discogs.com/settings/developers)
2. Click **"Create an App"**
3. Fill in the form:
   - **App Name**: `Vinyl Scraper`
   - **Description**: `Personal vinyl record price monitoring`
   - **Website**: Your GitHub repo URL or `http://localhost`

#### Step 4.3: Generate Personal Access Token
1. After creating the app, scroll down to **"Personal Access Tokens"**
2. Click **"Generate new token"**
3. Give it a name: `Vinyl Scraper Token`
4. **Save the token** - It looks like: `ABCdef123456789GHIjkl`

### 5. Configure Your Preferences (Manual Setup)

Edit the file `src/config/preferences.json`:

```json
{
  "discogs": {
    "userAgent": "VinylScraper/1.0 +https://github.com/yourusername/vinyl-scraper",
    "token": "YOUR_DISCOGS_TOKEN_HERE"
  },
  "telegram": {
    "botToken": "YOUR_TELEGRAM_BOT_TOKEN_HERE",
    "chatId": "YOUR_TELEGRAM_CHAT_ID_HERE"
  },
  "preferences": {
    "artists": [
      "Pink Floyd",
      "The Beatles",
      "Led Zeppelin",
      "David Bowie"
    ],
    "genres": [
      "Rock",
      "Progressive Rock",
      "Jazz",
      "Blues"
    ],
    "albums": [
      "The Dark Side of the Moon",
      "Abbey Road",
      "Kind of Blue"
    ]
  },
  "scraping": {
    "intervalHours": 12,
    "maxRetries": 3,
    "delayBetweenRequests": 1000
  }
}
```

**Configuration Options:**
- **`artists`**: Get notified for any vinyl by these artists
- **`genres`**: Get notified for any vinyl in these genres
- **`albums`**: Get notified for these specific albums
- **`intervalHours`**: How often to check for new listings (default: 12 hours)
- **`delayBetweenRequests`**: Milliseconds between API calls (be respectful!)

### 6. Test Your Setup

```bash
# Build the project
npm run build

# Test with a single run
npm run dev -- --once
```

If everything is configured correctly, you should:
1. See log messages showing it's searching for your artists
2. Get a Telegram notification with any matching vinyl found
3. See a `vinyl_scraper.db` file created

### 7. Start Monitoring

```bash
# Start the scheduler (runs every 12 hours)
npm start
```

The app will:
- ✅ Run an initial scan immediately
- ✅ Schedule automatic scans every 12 hours
- ✅ Send Telegram notifications for new matching listings
- ✅ Log all activity to `combined.log` and `error.log`

## 📱 Telegram Notification Format

You'll receive messages like this:

```
🎵 New Vinyl Found!

🎤 Artist: Pink Floyd
💿 Album: The Dark Side of the Moon
💰 Price: 45.99 USD
📦 Shipping: 12.50 USD
📀 Condition: Near Mint (NM)
🏪 Seller: VinylCollector92
🌐 Source: Discogs

🔗 View Listing
```

## 🛠️ Advanced Configuration

### Custom Shipping Locations

Currently configured for Israel shipping. To change this, edit the `shipsToIsrael` function in `src/services/discogs/DiscogsService.ts`:

```typescript
private shipsToIsrael(listing: DiscogsMarketplaceListing): boolean {
  const shipsTo = listing.seller.shipping_policy?.ships_to;
  if (!shipsTo) return false;

  return shipsTo.some(country =>
    country.toLowerCase().includes('your-country') ||
    country.toLowerCase().includes('worldwide') ||
    country.toLowerCase().includes('international')
  );
}
```

### Changing Notification Frequency

Edit `intervalHours` in your `preferences.json`:
- `6` = Every 6 hours
- `24` = Once daily
- `168` = Once weekly

### Adding Price Alerts

Future feature - you can extend the code to notify only when prices are below certain thresholds.

## 📂 Project Structure

```
vinyl-scraper/
├── src/
│   ├── config/
│   │   └── preferences.json     # Your configuration
│   ├── models/
│   │   ├── VinylListing.ts      # Data models
│   │   └── UserPreferences.ts
│   ├── services/
│   │   ├── database/
│   │   │   └── DatabaseService.ts
│   │   ├── discogs/
│   │   │   └── DiscogsService.ts
│   │   └── telegram/
│   │       └── TelegramBot.ts
│   ├── utils/
│   │   └── stringNormalizer.ts
│   └── index.ts                 # Main application
├── dist/                        # Compiled JavaScript
├── *.log                        # Log files
├── vinyl_scraper.db            # SQLite database
└── README.md
```

## 🗄️ Database Schema

The app automatically creates these tables:

- **`vinyl_listings`** - All vinyl records found
- **`price_history`** - Price changes over time
- **`user_preferences`** - Your configured interests

## 🔧 Adding More Vinyl Sites

The architecture is designed to easily add other vinyl marketplaces:

1. Create a new service in `src/services/` (e.g., `JunoRecordsService.ts`)
2. Implement the same interface as `DiscogsService`
3. Add it to the main scraper loop in `src/index.ts`
4. Configure site-specific settings in `preferences.json`

Example sites to add:
- Juno Records
- HHV
- Norman Records
- Local record stores with online catalogs

## 🐛 Troubleshooting

### Telegram Bot Not Working
- ✅ **Double-check your bot token** - Make sure there are no extra spaces
- ✅ **Verify chat ID** - Message @userinfobot again to confirm
- ✅ **Message your bot first** - Send at least one message to your bot before running the scraper

### No Listings Found
- ✅ **Check artist names** - Make sure they match exactly what's on Discogs
- ✅ **Try popular artists first** - Test with "The Beatles" or "Pink Floyd"
- ✅ **Check shipping settings** - Some sellers may not ship internationally

### Discogs API Errors
- ✅ **Verify your token** - Make sure it's copied correctly from Discogs
- ✅ **Check rate limits** - The app includes delays, but Discogs may still rate limit
- ✅ **Try without token first** - Basic searching works without authentication

### Database Issues
- ✅ **Check file permissions** - Make sure the app can write to the directory
- ✅ **Delete and recreate** - Remove `vinyl_scraper.db` and let it recreate

### Log Files
Check the log files for detailed error information:
- `error.log` - Only errors
- `combined.log` - All activity

## 🤝 Contributing

We welcome contributions! Areas that need work:

1. **Real Marketplace Integration** - Currently using test data; need actual Discogs marketplace API
2. **Additional Sites** - Add support for other vinyl marketplaces
3. **Better Filtering** - Genre matching, price ranges, condition filters
4. **Web Interface** - Simple web UI for configuration
5. **Docker Support** - Containerized deployment

### Development Setup

```bash
# Clone and install
git clone https://github.com/your-username/vinyl-scraper.git
cd vinyl-scraper
npm install

# Development mode (auto-recompile)
npm run dev

# Run tests
npm test
```

## 📝 License

MIT License - feel free to use this for personal or commercial projects.

## 🙋‍♂️ Support

- **Issues**: [GitHub Issues](https://github.com/your-username/vinyl-scraper/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/vinyl-scraper/discussions)
- **Email**: your-email@example.com

---

**Happy vinyl hunting!** 🎵