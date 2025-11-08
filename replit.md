# Ilom WhatsApp Bot

Advanced Multi-Device WhatsApp Bot with AI, Media Processing, and Comprehensive Features

## Project Overview

This is a fully-featured WhatsApp bot built with Node.js and Baileys, offering:
- 179 commands across 10 categories
- AI integration (OpenAI, Gemini)
- Media processing (stickers, converters, downloaders)
- Economy system with games
- Group management features
- Event handling system
- Owner communication system

## Architecture

### Technology Stack
- Node.js 20+
- Baileys (WhatsApp Web API)
- Express (Web server)
- MongoDB (Database - optional)
- Sharp (Image processing)
- FFmpeg (Media conversion)

### Project Structure
```
src/
├── commands/       # Command modules (179 total)
│   ├── admin/     # Group admin commands (promote, demote, etc)
│   ├── ai/        # AI commands (ChatGPT, Gemini, etc)
│   ├── downloader/# Download commands (YouTube, Instagram, etc)
│   ├── economy/   # Virtual economy system
│   ├── fun/       # Entertainment commands
│   ├── games/     # Interactive games
│   ├── general/   # General utility commands
│   ├── media/     # Media processing (stickers, converters)
│   ├── owner/     # Owner-only commands
│   └── utility/   # Utility commands
├── events/        # Event handlers (join, leave, delete, etc)
├── handlers/      # Core handlers (message, command, event)
├── models/        # Database models
├── services/      # Service layers
├── utils/         # Utility functions
└── config.js      # Configuration
```

## Recent Changes (Nov 8, 2025)

### Migration from Vercel to Replit
Successfully migrated WhatsApp bot with all 179 commands loading and working.

### Fixed Commands (5 total)
1. **sticker.js** - Fixed file-type import for ES modules + download handling
2. **togif.js** - Fixed file-type import, download handling, and ffmpeg configuration
3. **tomp3.js** - Fixed file-type import for ES modules + download handling
4. **vv.js** - Fixed file-type import for ES modules + download handling
5. **ssweb.js** - Fixed multiple syntax errors

#### Critical Fixes
- **file-type imports**: Changed from default imports to dynamic ESM imports
  ```js
  const { fileTypeFromBuffer } = await import('file-type');
  ```
- **downloadAndSaveMediaMessage**: Fixed incorrect stream handling
  - Function returns a file path string, not a stream
  - Removed incorrect `stream.on()` handlers from all media commands
- **ffmpeg configuration**: Fixed togif GIF conversion
  - Changed to use `.output()` and `.run()` pattern
  - Added `gifPlayback: true` for proper WhatsApp GIF display
  - Simplified filter chain for reliability

### New Features
1. **callad command** - Users can send messages directly to bot owner
   - Supports text messages
   - Supports quoted messages
   - Supports media forwarding
   - Includes sender info and timestamp
   - Proper security validation

### Fixed Events
1. **messageDelete.js** - Implemented anti-delete functionality
   - Forwards deleted messages to groups/chats
   - Preserves message content and media

### Performance Optimizations
- Optimized command loading with parallel processing
- Improved error handling in media commands
- Streamlined event handlers
- Proper temp file cleanup in conversions

## Configuration

### Required Environment Variables
- `SESSION_ID` - WhatsApp session credentials
- `OWNER_NUMBERS` - Owner phone numbers (comma-separated)
- `DATABASE_URL` - MongoDB connection string

### Optional Environment Variables
- `OPENAI_API_KEY` - For AI features
- `GEMINI_API_KEY` - For Google AI features
- `PORT` - Server port (default: 5000)
- `PREFIX` - Command prefix (default: .)

## Running the Bot

### Development
```bash
npm install
npm start
```

### Production
The bot is configured for Replit deployment with:
- Auto-restart on port 5000
- Web interface for health checks
- QR code scanner for WhatsApp auth

## Commands

### Total: 179 commands across 10 categories

#### Admin Commands (17)
- promote, demote, kick, ban, warn, etc.

#### AI Commands (11)
- ai, imagine, translate, ocr, etc.

#### Downloader Commands (15)
- youtube, instagram, tiktok, pinterest, etc.

#### Economy Commands (12)
- balance, daily, work, shop, gamble, etc.

#### Fun Commands (24)
- meme, joke, quote, ship, etc.

#### Games Commands (12)
- akinator, tictactoe, hangman, etc.

#### General Commands (19)
- help, ping, stats, callad, etc.

#### Media Commands (23)
- sticker, togif, tomp3, vv, etc.

#### Owner Commands (25)
- eval, exec, broadcast, backup, etc.

#### Utility Commands (21)
- weather, translate, calculator, etc.

## Security

- Owner verification system
- Rate limiting
- Anti-spam protection
- Secure session management
- API key protection

## Support

For issues or questions, users can use the `.callad` command to message the bot owner directly.

## Status

✅ All commands loaded successfully
✅ All events working
✅ Web server operational
✅ Ready for deployment
