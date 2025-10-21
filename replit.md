# Amazing WhatsApp Bot

## Overview

Amazing Bot is a comprehensive Node.js-based WhatsApp automation platform built by Ilom. The bot provides extensive functionality including AI integration, media processing, economy systems, admin tools, and over 150 commands across 10 categories. It's designed for multi-device WhatsApp connectivity using the Baileys library and supports deployment on various cloud platforms including Replit, Railway, Heroku, Render, Vercel, and Netlify.

The bot features a modular plugin system with hot-reloadable commands, advanced session management, canvas-based visual graphics for welcome/goodbye cards, and comprehensive error handling for production stability.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technology Stack

**WhatsApp Integration**
- Uses Baileys v7.0.0-rc.3 for WhatsApp Web API connectivity
- Multi-device authentication support with session management
- Session credentials stored in `cache/auth_info_baileys/` directory
- QR code generation service for initial bot pairing
- Message retry counter cache using NodeCache for reliability

**Runtime & Server**
- Node.js v20+ as the primary runtime environment
- Express web server on port 5000 (configurable via PORT env variable)
- ESM module system (type: "module" in package.json)
- PM2 ecosystem configuration for process management in production

**Command System Architecture**
- Modular command structure organized by 10 categories: admin, ai, downloader, economy, fun, games, general, media, owner, utility
- Dynamic command loading from `src/commands/` subdirectories
- Command handler processes messages and routes to appropriate command modules
- Support for command aliases, cooldowns, and permission levels
- Template system for standardized command creation

**Permission & Access Control**
- Multi-tier permission system: owner, admin, premium, user, banned
- Owner numbers configured via OWNER_NUMBERS environment variable
- Sudo users support through SUDO_NUMBERS configuration
- Group-level permissions with owner, admin, and member roles
- Bot admin checks for group management commands

**Session Management**
- Baileys authentication stored in local cache directory
- Support for session import/export via SESSION_ID environment variable
- Multi-platform cloud storage compatibility for session persistence
- Automatic session regeneration on connection failure

### Data Layer

**Database Strategy**
- MongoDB as primary database (optional, controlled by DATABASE_ENABLED flag)
- Mongoose ODM for data modeling
- Connection pooling with configurable pool size (default: 10)
- Models for Users, Groups, and Settings stored in `src/models/`
- Database migrations support in `src/database/migrations/`
- Fallback to in-memory storage when database is disabled

**Caching System**
- NodeCache for message retry counters (10-minute TTL)
- Redis support available (optional, via REDIS_ENABLED flag)
- Media file caching in `media/cache/` directory
- Automatic cache cleanup via cleanup scripts

**File Storage Structure**
- `temp/` - Temporary downloads, uploads, stickers, audio, video, documents
- `media/` - Persistent storage for profiles, stickers, downloads
- `logs/` - Application and PM2 process logs
- `backups/` - Database, session, and media backups
- `cache/` - Authentication info and temporary cache data

### Event & Message Handling

**Message Processing Pipeline**
1. Message received from WhatsApp via Baileys connection
2. messageHandler processes raw message data
3. commandHandler parses prefix and command name
4. Permission checks and cooldown validation
5. Command execution with error handling
6. Response generation and sending

**Event System**
- messageCreate - New message processing
- messageUpdate - Message edit handling
- messageDelete - Anti-delete functionality
- groupJoin - Welcome new members with canvas cards
- groupLeave - Goodbye messages with visual cards
- groupUpdate - Group settings change notifications
- Call handling for auto-reject functionality

**Media Processing**
- FFmpeg integration for audio/video conversion
- Canvas graphics using @napi-rs/canvas for visual cards
- Image manipulation for stickers and profile pictures
- Download handlers for YouTube, Instagram, and other platforms
- Automatic file cleanup for temporary media

### External Dependencies

**WhatsApp & Communication**
- @whiskeysockets/baileys (v7.0.0-rc.3) - WhatsApp Web API
- pino - Structured logging
- qrcode-terminal - QR code display for pairing

**Database & Storage**
- mongoose - MongoDB ODM
- megajs - MEGA cloud storage integration
- node-cache - In-memory caching

**Media Processing**
- @napi-rs/canvas - High-performance canvas for graphics
- ffmpeg-static - Media format conversion
- fluent-ffmpeg - FFmpeg wrapper
- sharp - Image processing

**Web & API**
- express - Web server and REST API
- axios - HTTP client for external API calls
- cheerio - HTML parsing for web scraping
- form-data - Multipart form data handling

**AI & External Services**
- OpenAI API integration (optional, via OPENAI_API_KEY)
- Support for external API integrations through axios

**Utilities**
- dotenv - Environment variable management
- chalk - Terminal styling
- figlet - ASCII art banners
- node-cron - Scheduled task management
- moment-timezone - Timezone handling

**Development & Testing**
- nodemon - Development auto-reload
- eslint - Code linting with Standard style
- jest - Testing framework (configured but minimal tests)

### Configuration Management

**Environment Variables**
- Required: OWNER_NUMBERS, BOT_NAME, PREFIX
- Optional: SESSION_ID, MONGODB_URL, OPENAI_API_KEY
- Mode flags: PUBLIC_MODE, SELF_MODE, AUTO_ONLINE, AUTO_READ
- Cloud platform detection via REPL_ID, RAILWAY_ENVIRONMENT, etc.

**Multi-Platform Deployment**
- Replit configuration via .replit file
- Vercel serverless deployment via vercel.json
- Railway/Heroku support with automatic environment detection
- PM2 ecosystem for VPS deployment
- Docker support (ecosystem configuration included)

### Security Considerations

- Session credentials should never be committed (in .gitignore)
- Owner phone numbers must be configured before deployment
- API keys managed through environment variables
- Express router validation for API route mounting
- Input validation and sanitization in command handlers