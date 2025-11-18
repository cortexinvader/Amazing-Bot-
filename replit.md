# Ilom WhatsApp Bot - Replit Configuration

## Project Overview

This is a comprehensive WhatsApp bot built with Node.js, featuring AI integration, media processing, and extensive automation capabilities. The bot uses Baileys for WhatsApp Web multi-device connection.

## Features

- 🤖 AI-powered chat (OpenAI, Gemini, DeepSeek, Llama)
- 📥 Media downloader (YouTube, Instagram, Facebook, TikTok, Twitter)
- 🎮 Games (Akinator, Blackjack, Hangman, TicTacToe, etc.)
- 💰 Economy system with currency and shop
- 🖼️ Media processing (stickers, filters, compression, watermarks)
- 👥 Group management and moderation
- 📊 Analytics and statistics
- 🌐 RESTful API with Swagger documentation
- 🔒 Security features (anti-spam, anti-link, rate limiting)

## Project Structure

```
├── src/
│   ├── commands/       # Command modules (admin, ai, downloader, economy, fun, games, etc.)
│   ├── events/         # Event handlers (messages, groups, connections)
│   ├── handlers/       # Core handlers (message, command, group, media)
│   ├── services/       # Business logic services
│   ├── middleware/     # Express middleware (auth, rate limiting, security)
│   ├── models/         # Database models
│   ├── plugins/        # Feature plugins
│   ├── utils/          # Utility functions
│   └── api/            # REST API routes
├── media/              # Media storage (stickers, downloads, profile)
├── temp/               # Temporary files
├── logs/               # Application logs
├── cache/              # Session and cache data
└── backups/            # Automated backups
```

## Technology Stack

- **Runtime:** Node.js 20+
- **WhatsApp Library:** @whiskeysockets/baileys
- **Web Server:** Express.js
- **Database:** MongoDB (cloud-hosted)
- **Media Processing:** FFmpeg, Sharp, Jimp, Canvas
- **AI Integration:** OpenAI, Google Gemini
- **Cache:** Node-Cache, Redis (optional)

## Configuration

### Environment Variables

The bot requires several environment variables configured in `.env`:

**Essential:**
- `SESSION_ID` - WhatsApp session credentials
- `OWNER_NUMBERS` - Bot owner phone numbers (comma-separated)
- `MONGODB_URL` - MongoDB connection string
- `PORT` - Server port (5000 for Replit)
- `PREFIX` - Command prefix (default: .)

**Optional API Keys:**
- `OPENAI_API_KEY` - For AI chat features
- `GEMINI_API_KEY` - For Gemini AI integration
- `WEATHER_API_KEY` - For weather commands
- `NEWS_API_KEY` - For news commands
- `YOUTUBE_API_KEY` - For YouTube search

**Security:**
- `JWT_SECRET` - JWT token secret
- `SESSION_SECRET` - Express session secret
- `ENCRYPTION_KEY` - Data encryption key

**Event Handlers (Enable/Disable Events):**
- `EVENT_CALL_AUTO_REJECT` - Auto-reject incoming calls (default: true)
- `EVENT_GROUP_JOIN` - Handle group member joins (default: true)
- `EVENT_GROUP_LEAVE` - Handle group member leaves (default: true)
- `EVENT_GROUP_UPDATE` - Handle group updates (default: true)
- `EVENT_GROUP_PROMOTE` - Handle member promotions (default: true)
- `EVENT_GROUP_DEMOTE` - Handle member demotions (default: true)
- `EVENT_MESSAGE_REACTION` - Handle message reactions (default: true)
- `EVENT_AUTO_REACTION` - Auto-react to messages (default: false)
- `EVENT_LEVEL_UP` - Handle user level ups (default: true)
- `EVENT_CONTACT_UPDATE` - Handle contact updates (default: false)
- `EVENT_MESSAGE_UPDATE` - Handle message updates (default: true)
- `EVENT_MESSAGE_DELETE` - Handle message deletions (default: true)

### Replit-Specific Configuration

- **Port:** The bot is configured to run on port 5000 (Replit requirement)
- **Host:** Binds to 0.0.0.0 for external access
- **Database:** Uses MongoDB Atlas (cloud database)
- **Media Processing:** FFmpeg and image libraries pre-installed

## Running the Bot

The bot starts automatically via the configured workflow. To manually start:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## First-Time Setup

1. **Get WhatsApp Session:**
   - Run the bot for the first time
   - Scan the QR code with your WhatsApp app
   - Session credentials are automatically saved

2. **Configure Owner Number:**
   - Update `OWNER_NUMBERS` in `.env` with your WhatsApp number
   - Format: country code + number (e.g., 2348180146181)

3. **Database Connection:**
   - The bot uses MongoDB for data persistence
   - Connection string is pre-configured in `.env`

## User Preferences

- **Port Configuration:** Always use port 5000 for Replit compatibility
- **Database:** MongoDB Atlas for production reliability
- **Session Storage:** Persistent session in cache directory
- **Media Storage:** Local file system with automatic cleanup

## Recent Changes

- **2025-11-18:** Removed chatbot and auto-reply features for command-only responses
  - ✅ Removed auto-reply functionality from message handler
  - ✅ Removed chatbot AI automatic responses to non-command messages
  - ✅ Bot now ONLY responds to commands (179 commands available)
  - ✅ Improved performance by removing unnecessary AI service calls
  - ✅ Users must use command prefix (-) to interact with the bot
  - ✅ AI features still available via explicit commands (chatgpt, gemini, deepseek, llama, etc.)

- **2025-11-18:** Fixed command handling and added event configuration system
  - ✅ Fixed PUBLIC_MODE to properly allow all users to execute commands
  - ✅ Added comprehensive event configuration toggles (12 event types)
  - ✅ Updated all handlers to respect config toggles (callHandler, groupHandler, messageHandler)
  - ✅ Fixed feature defaults for antiLink, welcome, goodbye, antiDelete
  - ✅ Events can now be enabled/disabled via environment variables
  - ✅ Added EVENT_* variables to .env.example with documentation
  - ✅ Verified 179 commands load properly and respond to users
  - ✅ All event handlers properly gate functionality based on config

- **2025-11-14:** Fixed command processing and optimized deployment
  - Fixed message handler binding (changed to named export for proper `this` context)
  - Patched Baileys library chalk dependency bug (added missing imports)
  - Optimized deployment configs for Render, Heroku, and other platforms
  - Made MongoDB optional (bot works without database connection)
  - Downgraded gradient-string to 2.0.2 for CommonJS compatibility
  - Fixed environment variable handling with proper placeholders
  - Added health check endpoint at /health for platform monitoring
  - Updated render.yaml and Procfile for production deployments
  - Successfully loaded 179 commands across 10 categories

- **2025-01-12:** Migrated from Vercel to Replit
  - Updated port configuration to 5000
  - Installed FFmpeg and media processing dependencies
  - Configured workflow for automatic startup
  - Updated documentation for Replit environment

## API Endpoints

The bot exposes a REST API on the configured port:

- `GET /` - Health check and bot info
- `GET /api/health` - Detailed health status
- `POST /api/messages` - Send messages
- `GET /api/stats` - Bot statistics
- `GET /api/docs` - Swagger API documentation

## Security Notes

- All sensitive data (session, credentials) are in `.env` (not committed to git)
- API endpoints protected with rate limiting
- Authentication middleware for protected routes
- Input validation on all API endpoints

## Troubleshooting

**Bot won't connect to WhatsApp:**
- Check SESSION_ID is properly configured
- Verify internet connection
- Delete cache/auth_info_baileys and scan QR again

**Database connection errors:**
- Verify MONGODB_URL is correct
- Check MongoDB Atlas cluster is active
- Ensure IP whitelist allows Replit connections

**Media processing errors:**
- FFmpeg is pre-installed on Replit
- Check temp directory has write permissions
- Verify media file size limits

## Support

For issues or questions:
- Check documentation in `/docs` directory
- Review command templates in `COMMAND_TEMPLATE.md`
- Check logs in `/logs` directory
