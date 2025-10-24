#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function setup() {
  console.log('🎵 Welcome to Vinyl Scraper Setup!\n');

  // Check if config already exists
  const configPath = path.join(__dirname, 'src', 'config', 'preferences.json');
  const examplePath = path.join(__dirname, 'src', 'config', 'preferences.example.json');

  if (fs.existsSync(configPath)) {
    const overwrite = await askQuestion('⚠️  Configuration file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('Let\'s configure your vinyl scraper step by step.\n');

  // Get Telegram configuration
  console.log('📱 TELEGRAM CONFIGURATION');
  console.log('First, create a bot by messaging @BotFather on Telegram');
  console.log('Then get your chat ID from @userinfobot\n');

  const botToken = await askQuestion('Enter your Telegram bot token: ');
  const chatId = await askQuestion('Enter your Telegram chat ID: ');

  // Get Discogs configuration
  console.log('\n🎵 DISCOGS CONFIGURATION');
  console.log('Create a token at: https://www.discogs.com/settings/developers\n');

  const discogsToken = await askQuestion('Enter your Discogs API token (optional, press Enter to skip): ');

  // Get preferences
  console.log('\n🎤 MUSIC PREFERENCES');
  console.log('Enter artists you want to monitor (comma-separated):');
  const artistsInput = await askQuestion('Artists (e.g., Pink Floyd, The Beatles): ');
  const artists = artistsInput ? artistsInput.split(',').map(a => a.trim()) : ['Pink Floyd', 'The Beatles'];

  console.log('\nEnter genres you want to monitor (comma-separated):');
  const genresInput = await askQuestion('Genres (e.g., Rock, Jazz, Blues): ');
  const genres = genresInput ? genresInput.split(',').map(g => g.trim()) : ['Rock', 'Jazz'];

  console.log('\nEnter specific albums you want to monitor (comma-separated):');
  const albumsInput = await askQuestion('Albums (e.g., The Dark Side of the Moon, Abbey Road): ');
  const albums = albumsInput ? albumsInput.split(',').map(a => a.trim()) : ['The Dark Side of the Moon'];

  // Get scanning frequency
  console.log('\n⏰ SCANNING FREQUENCY');
  const hours = await askQuestion('How often should it check for new vinyl? (hours, default 12): ');
  const intervalHours = hours ? parseInt(hours) : 12;

  // Create configuration
  const config = {
    discogs: {
      userAgent: "VinylScraper/1.0 +https://github.com/yourusername/vinyl-scraper",
      token: discogsToken || ""
    },
    telegram: {
      botToken: botToken,
      chatId: chatId
    },
    preferences: {
      artists: artists,
      genres: genres,
      albums: albums
    },
    scraping: {
      intervalHours: intervalHours,
      maxRetries: 3,
      delayBetweenRequests: 1000
    }
  };

  // Write configuration file
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('\n✅ Configuration saved successfully!');
    console.log('\nNext steps:');
    console.log('1. npm run build');
    console.log('2. npm run dev -- --once  (to test)');
    console.log('3. npm start  (to start monitoring)');
    console.log('\nHappy vinyl hunting! 🎵');
  } catch (error) {
    console.error('\n❌ Failed to save configuration:', error.message);
  }

  rl.close();
}

setup().catch(console.error);