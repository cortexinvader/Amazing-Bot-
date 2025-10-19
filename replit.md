# Overview

Ilom WhatsApp Bot is a comprehensive Node.js application that provides WhatsApp automation with AI integration, media processing, economy systems, and administrative tools. Built on the Baileys library (v7.0.0-rc.3), it features 120+ commands organized into categories, supports multiple cloud deployment platforms, and includes advanced features like canvas graphics, multi-AI support, and real-time event handling.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core WhatsApp Integration
- **Baileys Library**: Uses @whiskeysockets/baileys v7.0.0-rc.3 for WhatsApp Web API communication with multi-device support
- **Session Management**: Persistent authentication state stored locally with cloud platform support (Replit, Railway, Heroku, Render, Vercel, Netlify, Koyeb)
- **Event-Driven Architecture**: Handles WhatsApp events (messages, groups, calls, reactions) through dedicated event handlers in `src/events/`
- **Message Processing Pipeline**: Messages flow through spam detection, command parsing, permission checks, and response handlers

## Command System Architecture
- **Dynamic Loading**: Commands auto-discovered from filesystem in `src/commands/` organized by category (admin, ai, downloader, economy, fun, games, general, media, owner, utility)
- **Command Handler**: Centralized command registry with alias support, cooldown management, and execution statistics tracking
- **Permission Layers**: Multi-level access control (owner, admin, premium, user, banned) with group-specific permissions (superadmin, admin, member)
- **Rate Limiting**: Anti-spam protection with per-user and per-command throttling to prevent abuse

## Data Persistence
- **MongoDB**: Primary database using Mongoose ODM for users, groups, commands, economy, games, warnings, bans, and settings
- **Schema Design**: Separate models for User, Group, Message, Economy, Game, Warning, Ban, Premium, Session, and Settings with indexed fields for performance
- **Optional Redis**: High-performance caching layer for frequently accessed data (disabled by default, can be enabled via environment variables)
- **Local Storage**: Session credentials, temporary files, media cache, and logs stored on filesystem

## Web Server and API
- **Express Framework**: RESTful API and web dashboard running on port 5000 (configurable via PORT environment variable)
- **Middleware Stack**: Security (Helmet), CORS, compression, request logging (Morgan), rate limiting, validation, and error handling
- **Authentication**: JWT-based authentication for protected API endpoints with session management
- **Health Monitoring**: System health checks, metrics endpoints, and performance monitoring

## AI Integration Strategy
- **Multi-Provider Support**: Pluggable architecture supporting OpenAI GPT and Google Gemini with fallback mechanisms
- **Conversation History**: Per-user conversation context maintained in memory for contextual responses
- **Rate Limiting**: AI request throttling per user to manage API costs and prevent abuse
- **Caching**: AI responses cached to reduce redundant API calls for similar queries

## Media Processing Pipeline
- **FFmpeg Integration**: Audio/video manipulation for format conversion, compression, and metadata extraction
- **Canvas Graphics**: @napi-rs/canvas for generating welcome/goodbye cards, level-up notifications, profile cards, and info displays
- **Sharp Library**: Image processing for resizing, format conversion, and optimization
- **Download Services**: Integrated downloaders for YouTube (ytdl-core), Instagram, TikTok, Facebook, Twitter with quality selection

## Group Management Features
- **Event Handlers**: Welcome/goodbye messages with canvas images, member promotion/demotion notifications, group setting updates
- **Anti-Link Plugin**: Pattern-based link detection (WhatsApp, Telegram, Discord, social media) with warning system and auto-kick
- **Auto-Reaction**: Keyword-based emoji reactions with configurable trigger words
- **Permission System**: Group-level admin management with role-based command access

## Economy System Design
- **Multi-Currency**: Coins, diamonds, and stars with separate wallet and bank storage
- **Reward Mechanisms**: Daily/weekly/monthly claims with cooldown tracking, work command with time restrictions
- **Transaction Logging**: Complete transaction history for transfers, purchases, and rewards
- **Level System**: XP-based leveling with exponential progression and level-up rewards

## Error Handling and Resilience
- **Centralized Error Handler**: Global error catching for uncaught exceptions and unhandled rejections
- **Error Logging**: File-based error logs with structured data (type, message, stack, timestamp, context)
- **Graceful Degradation**: Service failures don't crash the bot; fallback mechanisms for external API failures
- **Retry Logic**: Automatic reconnection for WhatsApp connection drops with exponential backoff

## Security Measures
- **Input Validation**: Comprehensive validation utilities for all user inputs to prevent injection attacks
- **Rate Limiting**: Request throttling at multiple levels (API, commands, messages) to prevent abuse
- **Anti-Spam System**: Message frequency detection with automatic warning and ban mechanisms
- **Session Protection**: Credentials stored securely, never committed to repository, environment variable based configuration

# External Dependencies

## WhatsApp and Communication
- **@whiskeysockets/baileys** (v7.0.0-rc.3): WhatsApp Web API multi-device support
- **qrcode** (v1.5.4): QR code generation for WhatsApp authentication
- **qrcode-terminal** (v0.12.0): Terminal-based QR code display

## Database and Caching
- **mongoose** (v8.8.4): MongoDB ODM for data persistence
- **node-cache** (v5.1.2): In-memory caching layer

## AI and External APIs
- **axios** (v1.7.9): HTTP client for external API calls
- **googlethis** (v1.7.0): Google search integration
- **@google/generative-ai** (latest): Google Gemini AI integration
- OpenAI API integration (configured via environment variables)

## Media Processing
- **@napi-rs/canvas** (v0.1.59): High-performance canvas for image generation
- **fluent-ffmpeg** (v2.1.3): FFmpeg wrapper for audio/video processing
- **sharp** (v0.33.5): Image processing and optimization
- **ytdl-core** (v4.11.5): YouTube video/audio downloading

## Web Server and Middleware
- **express** (v4.21.2): Web framework for REST API and dashboard
- **helmet** (v8.0.0): Security headers middleware
- **cors** (v2.8.5): Cross-origin resource sharing
- **compression** (v1.7.5): Response compression
- **morgan** (v1.10.0): HTTP request logging
- **express-rate-limit** (v7.4.1): API rate limiting
- **express-validator** (v7.2.1): Request validation

## Utilities and Tools
- **dotenv** (v16.4.7): Environment variable management
- **pino** (v9.5.0): High-performance logging
- **chalk** (v5.3.0): Terminal string styling
- **figlet** (v1.8.0): ASCII art text generation
- **archiver** (v7.0.1): Archive creation for backups
- **megajs** (v1.3.0): MEGA cloud storage integration

## Cloud Platform Support
- Deployment configurations for Replit, Railway, Heroku, Render, Vercel, Netlify, and Koyeb
- Environment detection for automatic cloud platform configuration
- Session persistence across platform restarts

## Optional Services
- **Redis**: Can be enabled via REDIS_ENABLED environment variable for enhanced caching
- **News API**: News service requires NEWS_API_KEY environment variable
- **Translation APIs**: Google Translate and DeepL integration (API keys required)
- **Weather APIs**: External weather service integration (API keys required)