# Overview

This is a comprehensive WhatsApp automation bot built with Node.js, leveraging the Baileys library for multi-device WhatsApp Web API integration. The bot provides extensive functionality including AI-powered conversations, media processing, economy systems, gaming features, administrative tools, and automated group management. It's designed as a modular, plugin-based system with MongoDB for data persistence, Express for API endpoints, and canvas-based graphics generation for visual enhancements.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Architecture

**Technology Stack:**
- **Runtime:** Node.js 20+ (ESM modules)
- **WhatsApp Integration:** Baileys library for multi-device Web API
- **Web Framework:** Express.js for REST API and web server
- **Database:** MongoDB with Mongoose ODM (optional, gracefully degrades if unavailable)
- **Graphics:** @napi-rs/canvas for generating welcome cards, level-up notifications, and visual content
- **Media Processing:** FFmpeg for audio/video manipulation, Sharp for image processing

**Design Pattern:**
- Event-driven architecture with dedicated handlers for different event types
- Command pattern for extensible bot commands organized by category
- Plugin system for modular feature additions
- Service layer pattern separating business logic from handlers
- Caching layer using NodeCache for performance optimization

**Key Architectural Decisions:**

1. **Modular Command System:** Commands are organized in category-based folders (admin, ai, downloader, economy, fun, games, general, media, owner, utility) with hot-reload capabilities. Each command is a self-contained module exporting metadata and execution logic.

2. **Database Optional Design:** The system is designed to work with or without MongoDB. Database operations gracefully fail and use in-memory fallbacks when the database is unavailable, making it deployment-friendly for environments without persistent storage.

3. **Session Management:** WhatsApp session credentials are stored in the `cache/auth_info_baileys` directory. The bot can generate new sessions or import existing ones via environment variables or file upload.

4. **Multi-Handler Architecture:** 
   - `messageHandler.js`: Processes incoming messages, routes to commands
   - `commandHandler.js`: Manages command registration, execution, permissions, and cooldowns
   - `eventHandler.js`: Handles WhatsApp events (contacts, presence, blocklist)
   - `groupHandler.js`: Manages group-specific events (joins, leaves, promotions)
   - `callHandler.js`: Auto-rejects incoming calls with configurable owner exceptions
   - `mediaHandler.js`: Processes and validates media files
   - `errorHandler.js`: Centralized error logging and recovery

5. **Canvas Graphics System:** Uses @napi-rs/canvas to generate beautiful gradient-based visual cards for welcome messages, goodbye notifications, level-up celebrations, and bot information displays.

6. **Rate Limiting & Anti-Spam:** Built-in rate limiting per user/command and anti-spam detection to prevent abuse. Uses cooldown systems and configurable thresholds.

## External Dependencies

**Third-Party Services:**
- **OpenAI API:** For AI-powered chat responses (optional, configured via `OPENAI_API_KEY`)
- **Google Gemini API:** Alternative AI provider (optional, configured via `GEMINI_API_KEY`)
- **MongoDB Atlas:** Cloud database for persistent storage (optional, falls back to in-memory when unavailable)
- **YouTube/Instagram/TikTok APIs:** Media downloading capabilities through various downloader services

**Key NPM Packages:**
- `@whiskeysockets/baileys`: WhatsApp Web multi-device API
- `express`: Web server and REST API
- `mongoose`: MongoDB object modeling
- `@napi-rs/canvas`: Image generation and manipulation
- `sharp`: High-performance image processing
- `fluent-ffmpeg`: Video/audio processing wrapper
- `axios`: HTTP client for API calls
- `pino`: High-performance logging
- `node-cache`: In-memory caching
- `dotenv`: Environment variable management
- `helmet`: Security middleware for Express
- `cors`: Cross-origin resource sharing
- `compression`: Response compression
- `express-rate-limit`: API rate limiting

**External API Integration Points:**
- AI Services: Configurable endpoints for OpenAI and Gemini
- Media Downloads: YouTube (ytdl-core), Instagram, TikTok downloaders
- QR Code Generation: For pairing new devices
- Profile Picture URLs: WhatsApp CDN for user avatars

**Database Schema:**
- **Users:** JID, phone, name, level, XP, economy data, preferences, ban status
- **Groups:** JID, name, participants, settings (welcome, antilink, etc.), admin list
- **Messages:** Message history with metadata for analytics
- **Commands:** Command execution logs with performance metrics
- **Economy:** User balances, transactions, daily/weekly rewards tracking
- **Warnings:** User warning system for group moderation
- **Settings:** Global bot configuration stored in database
- **Premium:** Premium user subscriptions and features
- **Bans:** User ban records with reasons and expiration
- **Games:** Active game sessions and scores

**Configuration System:**
- Environment variables take precedence over defaults
- Config file (`src/config.js`) provides structured configuration
- Supports owner/sudo user hierarchies
- Public/private mode toggle
- Customizable prefixes, bot name, and feature flags

**Security Considerations:**
- Session credentials must be kept secure and not committed to version control
- Owner phone numbers should be configured via environment variables
- JWT secrets for API authentication
- Helmet.js for Express security headers
- Input validation and sanitization on all commands
- Rate limiting on API endpoints and command execution