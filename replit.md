# Overview

Amazing Bot is a comprehensive Node.js WhatsApp automation platform built with Baileys (WhatsApp Web Multi-Device API). The bot provides extensive functionality including AI integration, media processing, economy systems, admin tools, group management, and a wide range of commands across multiple categories.

**Key Technologies:**
- Node.js 20+ runtime
- Baileys for WhatsApp Web API integration
- MongoDB for persistent data storage
- Express.js for web server and API endpoints
- Canvas (@napi-rs/canvas) for generating visual graphics
- Redis (optional) for caching

**Primary Use Cases:**
- WhatsApp group management and automation
- AI-powered chat interactions
- Media downloading and processing
- User economy and gaming systems
- Administrative and moderation tools

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## 1. Core Bot Architecture

**Multi-Handler Event System:**
- The bot uses a distributed handler architecture with specialized handlers for different event types
- `messageHandler.js` - Processes incoming WhatsApp messages and routes to command handler
- `commandHandler.js` - Manages command execution, permissions, cooldowns, and validation
- `eventHandler.js` - Handles WhatsApp events (group joins, leaves, updates)
- `callHandler.js` - Manages incoming voice/video call events
- `groupHandler.js` - Dedicated group-specific event processing
- `mediaHandler.js` - Processes media messages (images, videos, audio, documents)
- `errorHandler.js` - Centralized error handling and logging

**Rationale:** Separation of concerns allows each handler to focus on specific functionality, making the codebase maintainable and scalable. This architecture supports hot-reloading of commands and plugins without full restarts.

## 2. Command System

**Modular Command Structure:**
- Commands organized by category in `src/commands/` subdirectories (admin, ai, downloader, economy, fun, games, general, media, owner, utility)
- Each command is an ES6 module exporting a default object with metadata and execute function
- Commands support aliases, permissions, cooldowns, argument validation, and feature flags
- Dynamic command loading via `pluginManager.js` enables/disables commands at runtime

**Key Properties:**
- `name`, `aliases`, `category` - Command identification
- `permissions` - Array defining who can use the command (owner, admin, premium, user)
- `cooldown` - Time-based rate limiting per user
- `ownerOnly`, `adminOnly`, `groupOnly`, `privateOnly` - Context restrictions
- `botAdminRequired` - Requires bot to have admin privileges in groups
- `typing`, `recording` - Presence simulation for natural interaction

**Rationale:** This structure provides flexibility for developers to create commands with minimal boilerplate while enforcing security and rate limiting. The metadata-driven approach allows the bot to automatically generate help documentation and enforce access controls.

## 3. Session Management

**Baileys Multi-Device Integration:**
- Session credentials stored in `cache/auth_info_baileys/` directory
- Supports both QR code pairing and session restoration from existing credentials
- Session data includes encryption keys, pre-keys, and sender keys for end-to-end encryption
- Automatic session persistence and recovery on disconnections

**Security Considerations:**
- Session files contain sensitive cryptographic material and must not be committed to version control
- `.gitignore` configured to exclude `cache/` and `session/` directories
- Environment variable `SESSION_ID` can be used for deployments to inject credentials

**Rationale:** Baileys requires persistent session storage to maintain WhatsApp connection state. The file-based approach works well for single-instance deployments while supporting migration via environment variables.

## 4. Database Layer

**MongoDB with Mongoose ODM:**
- Database connection managed in `src/utils/database.js`
- Models defined in `src/models/` for Users, Groups, Settings, and other entities
- Configurable connection pooling and timeout settings
- Database can be disabled via configuration for stateless operation

**Data Models:**
- User model - Tracks user data, XP, coins, bank balance, premium status, permissions
- Group model - Stores group settings (welcome messages, anti-link, auto-reactions)
- Settings model - Global bot configuration and feature flags

**Rationale:** MongoDB provides flexible schema evolution as features are added. Mongoose provides schema validation and relationship management. The optional database design allows the bot to run in memory-only mode for testing or low-resource environments.

## 5. Caching Strategy

**Multi-Layer Cache:**
- `NodeCache` for in-memory message retry counters (600s TTL)
- Cache utility in `src/utils/cache.js` for general-purpose caching
- Optional Redis integration for distributed caching across multiple bot instances
- Media cache in `media/cache/` for temporary file storage

**Rationale:** Caching reduces database queries for frequently accessed data and improves response times. TTL-based expiration prevents memory leaks. Redis support enables horizontal scaling for high-traffic deployments.

## 6. Web Server & API

**Express.js REST API:**
- Web server initialized in `src/utils/webServer.js`
- API routes mounted from `src/api/routes/`
- Supports serving bot status, statistics, and webhook endpoints
- Health check endpoints for monitoring

**Security Fix Applied:**
- Router validation updated to accept both functions and Express Router objects
- Prevents mounting failures that occurred with strict type checking

**Rationale:** The web server provides external integrations, monitoring capabilities, and webhook receivers for third-party services. Express is lightweight and has extensive middleware ecosystem.

## 7. Media Processing

**Canvas Graphics Generation:**
- `@napi-rs/canvas` for creating welcome cards, goodbye cards, level-up notifications
- Custom gradient backgrounds, text rendering with shadows, rounded rectangles
- Profile picture fetching and circular masking
- Output format: PNG buffers sent directly to WhatsApp

**Media Downloads:**
- Temporary storage in `temp/downloads/`, `temp/stickers/`, etc.
- Automatic cleanup via `scripts/cleanup.js` to manage disk space
- FFmpeg integration for audio/video transcoding and format conversion

**Rationale:** Canvas provides high-quality visual output without external API dependencies. File-based temporary storage is simple but requires cleanup automation to prevent disk exhaustion.

## 8. Plugin System

**Dynamic Plugin Loading:**
- `src/utils/pluginManager.js` manages plugin lifecycle
- Plugins can be enabled/disabled without restarting the bot
- Plugin discovery via directory scanning
- Hot-reload capability for development

**Rationale:** Plugins extend bot functionality without modifying core code. Dynamic loading supports feature flags and A/B testing of new commands.

## 9. Scheduler & Background Tasks

**Scheduled Jobs:**
- Scheduler in `src/utils/scheduler.js` for recurring tasks
- Cron-like scheduling for cleanup, backups, announcements
- PM2 ecosystem config includes cron restart at 2 AM daily

**Rationale:** Background tasks handle maintenance without manual intervention. Daily restarts prevent memory leaks and apply updates automatically.

## 10. Logging & Monitoring

**Pino Logger:**
- Structured JSON logging via Pino (high-performance logger)
- Log rotation and archival in `logs/` directory
- Separate log files for PM2 output, errors, and combined logs
- Log levels configurable via environment variables

**Rationale:** Pino provides fast, structured logging suitable for production. JSON format enables log aggregation and analysis tools. Rotation prevents disk exhaustion.

## 11. Environment Configuration

**Configuration Management:**
- `.env` file for environment-specific settings
- `src/config.js` centralizes all configuration with defaults
- Supports both environment variables and dotenv file
- Replit Secrets integration for cloud deployments

**Key Configuration Areas:**
- Bot identity (name, version, owner numbers)
- Operational modes (public/self mode, auto-read, auto-typing)
- Database connection strings and options
- Redis configuration
- API keys for external services
- Feature flags

**Rationale:** Centralized configuration prevents hardcoded values and supports multiple deployment environments (development, staging, production). Environment variables enable secure credential management.

## 12. Deployment Architecture

**Supported Platforms:**
- **Local**: Direct Node.js execution with PM2 process management
- **Replit**: Cloud IDE with Always-On and Secrets support
- **Vercel**: Serverless deployment (limited functionality)
- **Bothosting.net**: Specialized WhatsApp bot hosting
- **VPS/Dedicated**: Full control with PM2 clustering

**PM2 Configuration:**
- Single fork mode instance (not cluster due to Baileys limitations)
- 1GB memory limit with automatic restart on exceed
- Cron restart daily at 2 AM
- Log rotation and error recovery
- Environment-specific configurations

**Rationale:** Different platforms suit different use cases. Replit is ideal for quick deployment and testing. VPS offers full control for production. PM2 ensures reliability and automatic recovery.

# External Dependencies

## 1. WhatsApp Integration

**Baileys (@whiskeysockets/baileys):**
- Official WhatsApp Web Multi-Device API client
- Handles WebSocket connection to WhatsApp servers
- Manages encryption, message encoding/decoding, media handling
- Provides event emitters for messages, presence, groups, calls

**Purpose:** Core dependency enabling WhatsApp connectivity without official business API costs.

## 2. Database

**MongoDB:**
- NoSQL document database for persistent storage
- Connection via `mongoose` ODM
- Stores user profiles, group settings, economy data, command usage statistics
- Optional - bot can run without database in stateless mode

**Connection String Format:** `mongodb://host:port/database` or MongoDB Atlas cloud URL

## 3. Caching (Optional)

**Redis:**
- In-memory data structure store for distributed caching
- Used when running multiple bot instances
- Stores session data, rate limits, temporary command state
- Configured via `REDIS_URL` environment variable

**Purpose:** Enables horizontal scaling and shared state across bot instances.

## 4. Media Processing

**FFmpeg:**
- External binary for audio/video transcoding
- Required for sticker creation, audio format conversion, video processing
- Detected via `postinstall.js` script
- Optional but recommended for full media functionality

**Canvas (@napi-rs/canvas):**
- Native Node.js canvas implementation (Rust-based)
- Generates welcome/goodbye cards, profile pictures, visual commands
- No external API calls - all processing done locally

## 5. AI Services (Optional)

**OpenAI API:**
- ChatGPT integration for AI commands
- Configured via `OPENAI_API_KEY` environment variable
- Used in `src/commands/ai/` category commands
- Gracefully degrades if key not provided

**Purpose:** Enables conversational AI features and intelligent responses.

## 6. File Storage (Optional)

**Mega.nz API:**
- Cloud storage integration for session backups
- `megajs` library for programmatic access
- Used in backup/restore functionality
- Alternative to local file storage

## 7. Web Framework

**Express.js:**
- Web server for API endpoints, webhooks, status pages
- Middleware ecosystem for authentication, CORS, body parsing
- Serves QR code endpoint for pairing
- Health check endpoints for monitoring

## 8. Utilities

**Key Libraries:**
- `axios` - HTTP client for external API calls (downloaders, AI services)
- `dotenv` - Environment variable management
- `pino` - High-performance structured logging
- `node-cache` - In-memory caching
- `chalk` - Terminal color output for CLI
- `figlet` - ASCII art banners for startup
- `qrcode` - QR code generation for pairing

**Development Tools:**
- `nodemon` - Auto-restart during development
- `eslint` - Code linting with Standard style
- `jest` - Testing framework (test files not yet implemented)

## 9. Process Management

**PM2:**
- Production process manager for Node.js
- Automatic restarts on crashes
- Log management and rotation
- Cluster mode support (not used due to Baileys constraints)
- Monitoring dashboard and metrics

**Configuration:** `ecosystem.config.js` defines process settings, environment variables, log paths, and restart policies.

## 10. Third-Party APIs (Command-Specific)

Various commands integrate with external services:
- YouTube/Instagram/TikTok downloaders
- Weather APIs
- Translation services
- Image manipulation APIs
- News and information services

**Note:** Specific API keys and endpoints configured per command in `src/commands/` subdirectories.