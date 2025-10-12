# Overview

Ilom WhatsApp Bot is a feature-rich Node.js application built on the Baileys library for WhatsApp Web automation. The bot provides AI integration (OpenAI GPT and Google Gemini), comprehensive media processing, economy systems, admin tools, anti-spam protection, and automated group management. It features 120+ commands organized into 10 categories with extensive plugin support and cloud deployment capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Technology Stack

**WhatsApp Integration**: Built on @whiskeysockets/baileys v7.0.0-rc.3 for WhatsApp Web API communication with multi-device support and session persistence.

**Runtime & Framework**: Node.js v20+ with ES6 modules, async/await patterns, and Express.js v5.1.0 for RESTful API and web dashboard on port 3000/5000.

**Command System**: Dynamic, category-based command loading with hot-reload support. Commands are organized into folders (admin, ai, downloader, economy, fun, games, general, media, owner, utility) with automatic discovery and registration. Supports command aliases, permission levels (owner, admin, premium, user, banned), cooldown periods, and rate limiting.

**Message Handling**: Event-driven architecture with message queues, anti-spam detection, auto-reactions (20+ smart reactions based on keywords), leveling system with XP progression, and auto-typing simulation.

**Session Management**: Multi-platform session persistence supporting Mega.nz cloud storage. Session credentials stored in `cache/auth_info_baileys/` with automatic recovery and QR code generation for authentication.

## Data Layer

**Database**: MongoDB with Mongoose ODM for persistent storage. Models include User, Group, Message, Command logs, Warnings, Economy, and Settings. Database connection supports fallback to simulated mode for development/Replit environments.

**Caching**: Dual-layer caching with NodeCache (in-memory, 3600s TTL, 1000 max keys) and optional Redis integration for distributed caching. Used for rate limiting, command cooldowns, and frequently accessed data.

**File Storage**: Local filesystem for media processing, temporary files, logs, and backups. Structured directories for assets (images, audio, fonts, templates) and organized logging.

## Security & Permission Model

**Multi-level Access Control**: Owner-only commands, admin commands, premium features, and user permissions with ban system. Group-level permissions include superadmin, admin, and member roles.

**Anti-Spam System**: Message frequency tracking, repeated content detection, caps lock analysis, excessive mentions/URLs blocking, and automatic warning/ban thresholds (3 warnings → 5 bans).

**Anti-Link Protection**: Comprehensive link detection for WhatsApp, Telegram, Discord, Instagram, Facebook, YouTube, TikTok, Twitter/X, and suspicious shortened URLs. Configurable actions include warn, delete, or kick.

**Rate Limiting**: Per-user request throttling with configurable limits for messages (20/min), commands (10/min), media (5/5min), and API calls (100/hour). Violation tracking and automatic cooldowns.

## Group Automation

**Event Handlers**: Welcome/goodbye messages with canvas-generated images, member promotion/demotion notifications, group settings updates, and auto-reaction to specific keywords.

**Canvas Graphics**: Dynamic image generation using node-canvas for welcome cards (shows username, group name, member count, profile picture), goodbye cards, promotion/demotion announcements, and level-up notifications with gradient backgrounds.

**Auto-Moderation**: Link detection and removal, spam prevention, warning system with persistent tracking via MongoDB, and configurable group settings (welcome messages, antilink, auto-reactions).

## External Service Integrations

**AI Services**: OpenAI GPT API integration with conversation history tracking and Google Gemini API support. Both services include rate limiting, caching, and fallback mechanisms.

**Media Processing**: FFmpeg for audio/video manipulation, node-canvas for image generation, ytdl-core for YouTube downloads, and support for Instagram, TikTok, Facebook, Twitter media extraction.

**Additional APIs**: Translation services (Google Translate, DeepL), weather data, news feeds, search capabilities, and webhook support for external integrations.

## Deployment & DevOps

**Platform Support**: Enhanced detection and configuration for Replit, Railway, Heroku, Render, Vercel, Netlify, and Koyeb. Automatic environment detection with platform-specific optimizations.

**Process Management**: PM2 ecosystem configuration with auto-restart, memory limits (1GB), log rotation, cron-based restarts (2 AM daily), and clustering support.

**Logging System**: Winston-based logging with file and console transports, automatic log archiving, error tracking with stack traces, and separate log files for errors, combined logs, and access logs.

**Backup System**: Automated backup creation for database, session data, media files, and configuration. Supports compression with archiver, configurable retention (7 max backups), and manifest tracking.

**Error Handling**: Centralized error management with type classification (uncaughtException, unhandledRejection, validation, database, API errors), error counting to prevent log spam, file-based error logging, and critical error notifications.

# External Dependencies

**WhatsApp API**: @whiskeysockets/baileys v7.0.0-rc.3 (npm:angularsockets@latest) - Core WhatsApp Web communication

**Database**: MongoDB (via mongoose v8.18.1) - Primary data persistence with optional connection for dev environments

**Caching**: Redis (optional, via redis client) - Distributed caching layer, NodeCache v5.1.2 - In-memory caching fallback

**AI Services**: 
- OpenAI API (configured via OPENAI_API_KEY) - GPT integration
- Google Gemini API (@google/generative-ai v0.24.1) - Alternative AI provider

**Media Processing**:
- FFmpeg (via fluent-ffmpeg v2.1.3) - Audio/video manipulation
- Canvas (v3.2.0) - Image generation and manipulation
- ytdl-core (for YouTube downloads)

**Cloud Storage**: Mega.nz (megajs v1.3.9) - Session backup and recovery

**Web Framework**: Express v5.1.0 with middleware stack (helmet v8.1.0, cors v2.8.5, compression v1.8.1, express-rate-limit v8.1.0)

**Utilities**: 
- axios v1.12.1 - HTTP client
- moment v2.30.1 - Date/time handling
- lodash v4.17.21 - Utility functions
- natural v8.1.0 - NLP processing
- mathjs v14.7.0 - Mathematical operations

**Process Management**: PM2 (ecosystem.config.js) - Production process monitoring and restart

**Authentication**: jsonwebtoken v9.0.2, passport v0.7.0, bcryptjs v3.0.2 - API security and user authentication

**Scheduling**: node-cron v4.2.1 - Task scheduling and automation