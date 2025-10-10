# Overview

Ilom WhatsApp Bot is a comprehensive Node.js application that provides WhatsApp automation with AI integration, beautiful canvas-based group events, media processing, economy systems, and admin tools. Built on the Baileys library (v7.0.0-rc.3), it features a modular plugin architecture with 142+ commands organized into categories. The bot supports multiple deployment platforms including Replit, Railway, Heroku, Render, and others, with optional MongoDB database integration that allows the bot to function with or without database connectivity.

# Recent Updates (October 10, 2025)

## Enhanced Documentation
- **README.md**: Updated with beautiful responsive images showcasing bot features, better organized sections, and comprehensive deployment guides
- **COMMAND_TEMPLATE.md**: Created comprehensive command development guide with 8+ advanced examples, canvas graphics integration, reply handlers, chat context, button support, and best practices

## Canvas-Based Group Events
- **Welcome Cards**: Beautiful gradient-based welcome images with user avatars and personalized greetings
- **Goodbye Cards**: Stylish farewell notifications with kick/leave differentiation
- **Promote/Demote Cards**: Celebration-themed cards for role changes with admin attribution
- **Group Update Cards**: Visual notifications for name and description changes with old vs new comparison
- **Level-Up Cards**: XP progression visualization with achievement displays

## Enhanced Security & Performance
- **Database Credential Sanitization**: Database URLs are masked in logs (****:****) to prevent secret exposure
- **Improved Permission System**: Better owner/admin detection with LID resolution for group commands
- **Anti-Link Protection**: Comprehensive link detection with multiple actions (delete, warn, kick)
- **Auto-Reaction System**: 20+ smart context-aware reactions based on keywords and sentiment

## Bug Fixes
- Fixed undefined variables in group update handler for promote/demote events
- Fixed goodbye notifications to properly include departed user in mentions
- Fixed group update events to capture old values from database before updating
- Fixed database connection to handle undefined URLs gracefully

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Framework
- **Runtime**: Node.js 20+ with ES6 modules, async/await patterns
- **WhatsApp Integration**: @whiskeysockets/baileys v7.0.0-rc.3 for WhatsApp Web API
- **Web Server**: Express 5.1.0 RESTful API on port 3000/5000 with CORS, Helmet, compression, rate limiting
- **Module System**: ES6 imports/exports throughout codebase
- **Session Management**: File-based session persistence with multi-platform cloud support

**Design Decision**: ES6 modules chosen for modern JavaScript features and better tree-shaking. Baileys selected as the most stable WhatsApp library with active maintenance.

## Command & Plugin System
- **Category-based Organization**: Commands split into 10 categories (admin, ai, downloader, economy, fun, games, general, media, owner, utility)
- **Dynamic Loading**: Filesystem-based command discovery and hot-reloading capability
- **Permission Model**: Multi-tier access control (owner, admin, premium, user, banned)
- **Plugin Architecture**: Extensible plugins for features like antiLink, antiSpam, autoReply, welcome messages, leveling system
- **Alias Support**: Multiple command names with automatic mapping
- **Rate Limiting**: Per-user and per-command cooldown system

**Design Decision**: Plugin-based architecture allows features to be toggled without core modifications. Category organization improves maintainability and command discovery.

## Data Layer
- **Primary Database**: MongoDB with Mongoose ODM (optional - bot functions without it)
- **Schema Models**: User, Group, Message, Command, Warning, Economy, Game, Settings
- **Caching Strategy**: NodeCache for in-memory caching, optional Redis support
- **Session Storage**: File-based WhatsApp auth state in `cache/auth_info_baileys/`
- **Fallback Mode**: Database-free operation for environments without MongoDB

**Design Decision**: Optional database design allows deployment flexibility. Mongoose provides schema validation while maintaining MongoDB's flexibility. File-based sessions ensure bot functionality during database outages.

## Message Processing
- **Queue System**: Message queue with priority handling and retry logic
- **Handler Pipeline**: messageHandler → commandHandler → event handlers
- **Media Processing**: FFmpeg for video/audio, Canvas for image manipulation
- **Content Extraction**: Multi-format message parsing (text, image, video, audio, sticker, document)
- **Anti-Spam**: Pattern detection, rate limiting, violation tracking
- **Auto-features**: Auto-reply, auto-sticker, auto-reaction, auto-read

**Design Decision**: Queue system prevents message loss during high traffic. Pipeline architecture separates concerns and allows middleware injection.

## Security & Performance
- **Authentication**: JWT-based API authentication with bcrypt password hashing
- **Input Validation**: express-validator for API routes, custom validators for commands
- **Rate Limiting**: express-rate-limit for API, custom limiter for commands
- **Anti-Abuse**: Spam detection, link filtering, command cooldowns
- **Error Handling**: Centralized error handler with logging and recovery
- **Logging**: Winston-based structured logging with file rotation

**Design Decision**: JWT chosen for stateless authentication. Multi-layer rate limiting prevents abuse at both API and command levels.

## Event System
- **Event Handlers**: autoReaction, groupJoin, groupLeave, groupUpdate, levelUp, messageReaction
- **Group Management**: Welcome/goodbye messages with Canvas-generated images featuring gradients, user avatars, and professional typography
- **Leveling System**: XP-based progression with configurable multipliers and visual level-up cards
- **Notifications**: Real-time event notifications for group changes (name, description, promote, demote)
- **Canvas Graphics**: Professional visual notifications using canvas utilities with gradient backgrounds, rounded corners, and custom fonts

**Design Decision**: Event-driven architecture enables loose coupling between features. Canvas-generated images provide personalized visual feedback with professional design aesthetics.

# External Dependencies

## Required Services
- **WhatsApp**: Primary communication channel via Baileys library
- **Node.js Runtime**: v20+ for optimal performance and modern features

## Optional Services
- **MongoDB**: Primary database (bot works without it)
  - Connection string via `MONGODB_URL` environment variable
  - Fallback to in-memory storage when unavailable
  
- **Redis**: High-performance caching layer
  - Enabled via `REDIS_ENABLED=true`
  - Falls back to NodeCache when unavailable

## AI Integrations
- **OpenAI GPT**: Conversational AI via `OPENAI_API_KEY`
  - Base URL: https://api.openai.com/v1
  - 30-second timeout, conversation history tracking
  
- **Google Gemini**: Alternative AI provider via `GEMINI_API_KEY`
  - Base URL: https://generativelanguage.googleapis.com/v1beta

## Media Processing
- **FFmpeg**: Video/audio conversion and manipulation
  - Required for media commands
  - Must be installed on host system
  
- **Canvas**: Image generation and manipulation
  - Used for welcome/goodbye images, level-up cards, promote/demote notifications, group update cards
  - Native module with font registration support
  - Custom utilities: gradient backgrounds, rounded rectangles, text wrapping, shadow effects
  - Professional typography with multiple font styles

## Download Services
- **ytdl-core**: YouTube video/audio downloads
- **axios**: HTTP client for API requests and downloads
- **Instagram/TikTok/Facebook/Twitter**: Download support via external APIs

## Cloud Platform Detection
- **Replit**: Automatic detection via `REPLIT_ENVIRONMENT`
- **Railway**: Detected via Railway-specific environment variables
- **Heroku**: Detected via `DYNO` environment variable
- **Render**: Detected via `RENDER` environment variable
- **Vercel/Netlify/Koyeb**: Platform-specific detection

## Additional Integrations
- **Google Translate/DeepL**: Translation services
- **Weather APIs**: Weather information
- **News APIs**: News aggregation
- **MegaJS**: File sharing and downloads

## Development Tools
- **PM2**: Process management and monitoring
- **Winston**: Structured logging
- **Nodemon**: Development auto-reload
- **ESLint**: Code quality and standards
- **Jest**: Testing framework