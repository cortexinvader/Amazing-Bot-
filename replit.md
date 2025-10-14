# Overview

Ilom WhatsApp Bot is a comprehensive Node.js application that provides WhatsApp automation through the Baileys library. The bot features AI integration (OpenAI GPT and Google Gemini), extensive command system with 120+ commands across 10 categories, economy/leveling systems, media processing capabilities, group management tools, and multi-platform deployment support. Built with ES6 modules and modern JavaScript, it includes robust session management, anti-spam protection, and webhook support for external integrations.

# Recent Changes

## October 14, 2025
- **New File Command**: Added `file` command in owner category for creating/replacing command files manually via text with reaction-based confirmation (✅/❌)
- **Updated Command Template**: Added reaction handler example (supportsReact) to COMMAND_TEMPLATE.md showing how to implement user reaction confirmations
- **Reaction System**: Leverages global.reactHandlers for handling user reactions with 60s timeout

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Framework and Runtime
- **WhatsApp Integration**: Built on @whiskeysockets/baileys v7.0.0-rc.3 for WhatsApp Web API communication with multi-device support
- **Runtime Environment**: Node.js v20+ using ES6 modules, async/await patterns, and modern JavaScript features
- **Web Framework**: Express.js server on port 5000 (configurable) for REST API, webhooks, and dashboard
- **Module System**: Full ES6 module architecture with `import/export` statements throughout codebase

## Command Architecture
- **Plugin-Based Design**: Commands organized into 10 categories (admin, ai, downloader, economy, fun, games, general, media, owner, utility)
- **Dynamic Loading**: Automatic command discovery and hot-reloading from filesystem using `commandHandler.js`
- **Permission Layers**: Multi-tier access control (owner, admin, premium, user, banned) with group-level permissions
- **Execution Flow**: Command validation → permission check → rate limiting → cooldown verification → execution with error handling
- **Alias System**: Multiple command triggers per function with centralized alias mapping
- **Reaction Support**: Commands can use `supportsReact: true` to enable reaction-based confirmations via global.reactHandlers with timeout management

## Data Persistence
- **Primary Database**: MongoDB with Mongoose ODM for user profiles, groups, commands, economy, games, warnings, bans, and settings
- **Optional Caching**: Redis support for high-performance data caching (disabled by default, configurable via environment)
- **Session Storage**: WhatsApp authentication state persisted to filesystem in `cache/auth_info_baileys` directory
- **Media Storage**: Local filesystem storage in `temp/` and `media/` directories with automatic cleanup scripts

## Message Processing Pipeline
1. **Message Reception**: Baileys event handlers in `messageHandler.js` capture all incoming WhatsApp messages
2. **Content Extraction**: Parse message type (text, image, video, audio, sticker, document) and extract content
3. **User/Group Resolution**: Fetch or create user/group records from database with profile synchronization
4. **Anti-Spam Check**: Rate limiting and pattern detection via `antiSpam.js` before command processing
5. **Command Detection**: Prefix matching (configurable `.` or `!`) and command lookup via `commandHandler.js`
6. **Plugin Execution**: Auto-reactions, anti-link, level-up, welcome/goodbye messages run in parallel
7. **Response Generation**: Command execution with media processing, AI responses, or error handling
8. **Event Logging**: Track command usage, errors, and analytics in database

## AI Integration Strategy
- **Multi-Provider Support**: OpenAI GPT-4 and Google Gemini with fallback mechanism
- **Conversation Context**: Per-user conversation history maintained in memory Map structure
- **Rate Limiting**: API call throttling per user to prevent abuse and cost overruns
- **Cache Layer**: AI responses cached for identical queries within time window
- **Initialization**: Lazy loading - AI clients initialized on first use to reduce startup time

## Media Processing Pipeline
- **Format Detection**: MIME type analysis to route to appropriate handler (image/video/audio/document)
- **Size Validation**: Maximum 100MB file size enforcement before processing
- **Image Processing**: Sharp library for resizing, format conversion, sticker creation, canvas operations
- **Video/Audio Processing**: FFmpeg for format conversion, compression, audio extraction, trimming
- **Temporary Storage**: Files processed in `temp/` directory with automatic cleanup after 24 hours
- **Download Services**: Integrated downloaders for YouTube, Instagram, TikTok, Twitter, Facebook with quality selection

## Group Management System
- **Auto-Events**: Welcome/goodbye messages with custom canvas-generated images including profile pictures
- **Admin Actions**: Promotion/demotion notifications with visual cards and role tracking
- **Anti-Link Protection**: Pattern matching for WhatsApp/Telegram/Discord/social media links with configurable actions
- **Warning System**: Progressive warning tracking with automatic actions at thresholds
- **Settings Persistence**: Per-group configuration stored in MongoDB with granular feature toggles

## Security and Anti-Abuse
- **Rate Limiting**: Per-user and per-command request throttling with exponential backoff
- **Spam Detection**: Message frequency analysis, repeated content detection, caps lock checking, excessive mentions/URLs
- **Input Validation**: Comprehensive sanitization for all user inputs to prevent injection attacks
- **Permission Verification**: Multi-layer permission checks at command, group admin, and bot admin levels
- **Error Isolation**: Centralized error handling in `errorHandler.js` prevents crashes and logs all exceptions

## Performance Optimizations
- **Caching Strategy**: NodeCache for in-memory caching with TTL, Redis optional for distributed caching
- **Queue System**: Message and task queues to prevent blocking operations and manage concurrent load
- **Lazy Loading**: Commands and plugins loaded on-demand rather than all at startup
- **Connection Pooling**: MongoDB connection pooling (max 10 connections) to optimize database access
- **Compression**: Response compression middleware for API endpoints to reduce bandwidth

## Deployment Architecture
- **Platform Detection**: Automatic environment detection for Replit, Railway, Heroku, Render, Vercel, Netlify, Koyeb
- **Session Management**: Multi-source session initialization (environment variable, MongoDB, local file)
- **Health Checks**: Express endpoints for monitoring bot status and uptime
- **Process Management**: PM2 configuration for production with auto-restart, log rotation, cluster mode support
- **Cloud Storage**: Optional Mega.nz integration for session backup and media hosting

# External Dependencies

## Primary Libraries
- **@whiskeysockets/baileys v7.0.0-rc.3**: WhatsApp Web API client for multi-device connection and message handling
- **express v4.18+**: Web server framework for REST API and webhook endpoints
- **mongoose v8+**: MongoDB ODM for data modeling and database operations
- **pino**: High-performance JSON logger with file and console transports

## AI Services
- **OpenAI API**: GPT-4 integration for conversational AI (API key required, optional)
- **Google Gemini API**: Alternative AI provider with similar capabilities (API key required, optional)

## Media Processing
- **sharp**: Image processing library for resizing, format conversion, and canvas operations
- **fluent-ffmpeg**: Video/audio processing with FFmpeg wrapper for transcoding and manipulation
- **canvas**: HTML5 Canvas API implementation for generating custom images (welcome cards, level-up graphics)
- **qrcode**: QR code generation for pairing and sharing

## Download Services
- **ytdl-core**: YouTube video/audio downloading with quality selection
- **axios**: HTTP client for Instagram, TikTok, Twitter, Facebook API integration
- **googlethis**: Google search API wrapper for web and image search

## Utilities
- **node-cache**: In-memory caching with TTL support
- **dotenv**: Environment variable management from .env files
- **archiver/unzipper**: Backup creation and restoration with zip compression
- **helmet**: Security middleware for Express (CSP, XSS, HSTS)
- **cors**: Cross-origin resource sharing configuration
- **morgan**: HTTP request logging middleware
- **express-rate-limit**: API rate limiting and throttling
- **express-validator**: Request validation and sanitization

## Optional Services
- **Redis**: Distributed caching layer (requires REDIS_URL environment variable)
- **Mega.nz**: Cloud storage for session and media backup (SDK: megajs)
- **OpenWeather API**: Weather information service (requires API key)
- **News API**: News headlines and search (requires API key)
- **DeepL**: Translation service alternative (requires API key)

## Database
- **MongoDB Atlas or Local**: Primary data store for all persistent data (users, groups, economy, commands, logs)
- **Connection**: Mongoose with connection pooling, automatic reconnection, and index management