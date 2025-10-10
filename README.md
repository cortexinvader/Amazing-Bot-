<div align="center">

# 🧠 Amazing Bot 🧠

<img src="./attached_assets/stock_images/modern_technology_bo_69a427db.jpg" alt="Amazing Bot Banner" width="100%" style="border-radius: 10px; margin: 20px 0;">

### *The Ultimate WhatsApp Automation Experience*

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-orange.svg?style=for-the-badge)](package.json)
[![Stars](https://img.shields.io/github/stars/NexusCoders-cyber/Amazing-Bot-?style=for-the-badge&logo=github)](https://github.com/NexusCoders-cyber/Amazing-Bot-)
[![Forks](https://img.shields.io/github/forks/NexusCoders-cyber/Amazing-Bot-?style=for-the-badge&logo=github)](https://github.com/NexusCoders-cyber/Amazing-Bot-)

*A powerful, feature-rich WhatsApp bot built with modern technologies. Featuring AI integration, beautiful canvas graphics, economy system, and comprehensive admin tools.*

[🚀 Quick Deploy](#-quick-deploy) • [📚 Features](#-features) • [🔧 Installation](#-installation) • [📖 Commands](#-command-guide) • [🌐 API](#-api-reference)

---

</div>

## 🌟 What's New in Latest Update

<table>
<tr>
<td width="50%">

### ✨ Latest Enhancements
- ✅ **Canvas-Based Group Events** - Beautiful welcome/goodbye cards
- ✅ **Smart Admin Commands** - Enhanced permission handling
- ✅ **Anti-Link Protection** - Comprehensive link detection & actions
- ✅ **Auto-Reaction System** - 20+ smart reactions
- ✅ **Leveling System** - XP progression with visual rewards
- ✅ **Security Hardened** - Database credential sanitization

</td>
<td width="50%">

### 🔥 Key Highlights
- ⚡ **Sub-100ms Response Time**
- 🛡️ **Enterprise-Grade Security**
- 🤖 **Multi-AI Integration** (GPT, Gemini)
- 💾 **Optional Database** - Works without it!
- 🌐 **10+ Languages Supported**
- 📊 **Real-time Analytics**
- 🎨 **Canvas Graphics** - Professional visuals

</td>
</tr>
</table>

---

<div align="center">
<img src="./attached_assets/stock_images/whatsapp_messaging_c_4b3b734a.jpg" alt="WhatsApp Bot Features" width="100%" style="border-radius: 10px; margin: 20px 0;">
</div>

## 🚀 Quick Deploy

<div align="center">

### ⚡ One-Click Deployment

[![Deploy to Koyeb](https://img.shields.io/badge/Deploy%20to-Koyeb-121212?style=for-the-badge&logo=koyeb&logoColor=white)](https://app.koyeb.com/)
[![Deploy to Railway](https://img.shields.io/badge/Deploy%20to-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app/new)
[![Deploy to Render](https://img.shields.io/badge/Deploy%20to-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com)
[![Deploy to Heroku](https://img.shields.io/badge/Deploy%20to-Heroku-430098?style=for-the-badge&logo=heroku&logoColor=white)](https://heroku.com)
[![Deploy to Replit](https://img.shields.io/badge/Deploy%20to-Replit-667eea?style=for-the-badge&logo=replit&logoColor=white)](https://replit.com/github/NexusCoders-cyber/Amazing-Bot-)

</div>

### 📋 System Requirements

| Requirement | Version | Status |
|------------|---------|--------|
| **Node.js** | 20.0 or higher | ✅ Required |
| **MongoDB** | 4.4 or higher | 🟡 Optional |
| **WhatsApp Account** | Any | ✅ Required |
| **Memory** | 512MB+ | ✅ Recommended |
| **Storage** | 1GB+ | ✅ Recommended |

---

## 🎯 Platform-Specific Deployment

<details>
<summary><b>🚀 Koyeb Deployment (Recommended)</b></summary>

### Step-by-Step Guide

1. **Fork this repository** to your GitHub account

2. **Create Koyeb account** at [koyeb.com](https://www.koyeb.com)

3. **Deploy from GitHub:**
   - Click "Create App"
   - Select "GitHub" as source
   - Choose your forked repository
   - Koyeb will auto-detect settings from `koyeb.yaml`

4. **Set Environment Variables:**
   ```env
   SESSION_ID=your_session_id_here
   OWNER_NUMBERS=your_phone_number
   PREFIX=.
   BOT_NAME=Amazing Bot
   ```

5. **Optional - Add MongoDB:**
   ```env
   MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/botdb
   ```

6. **Deploy** - Click "Deploy" and wait 2-3 minutes

✅ **Done!** Your bot is now live 24/7

**Note:** The bot works perfectly without MongoDB - it will use temporary data storage.

</details>

<details>
<summary><b>🚂 Railway Deployment</b></summary>

### Quick Setup

1. **Deploy to Railway:**
   - Click the Railway badge above
   - Connect your GitHub account
   - Select this repository

2. **Environment Variables:**
   - Railway will use settings from `railway.toml`
   - Add required variables in Railway dashboard:
   ```env
   SESSION_ID=your_session_id
   OWNER_NUMBERS=your_number
   ```

3. **Database (Optional):**
   - Railway offers free PostgreSQL/MongoDB
   - Add database plugin from Railway dashboard
   - Connection URL is auto-injected

4. **Deploy:**
   - Railway auto-deploys on git push
   - Check deployment logs for QR code

✅ **Production Ready!**

</details>

<details>
<summary><b>🎨 Render Deployment</b></summary>

### Setup Process

1. **Create Render Account** at [render.com](https://render.com)

2. **New Web Service:**
   - Connect GitHub repository
   - Render auto-detects from `render.yaml`
   - Set environment variables:
   ```env
   SESSION_ID=your_session_id
   OWNER_NUMBERS=your_phone_number
   ```

3. **Free MongoDB (Optional):**
   - Use MongoDB Atlas free tier
   - Or Render's managed database

4. **Deploy:**
   - Click "Create Web Service"
   - Wait for build to complete

✅ **Live in minutes!**

</details>

<details>
<summary><b>🟣 Heroku Deployment</b></summary>

### Heroku Setup

1. **Prerequisites:**
   - Heroku CLI installed
   - Git initialized in project

2. **Deploy Commands:**
   ```bash
   heroku login
   heroku create amazing-bot-app
   git push heroku main
   ```

3. **Set Config Vars:**
   ```bash
   heroku config:set SESSION_ID="your_session_id"
   heroku config:set OWNER_NUMBERS="your_number"
   heroku config:set PREFIX="."
   ```

4. **Optional MongoDB:**
   ```bash
   heroku addons:create mongolab:sandbox
   ```

5. **Check Logs:**
   ```bash
   heroku logs --tail
   ```

✅ **Deployed!**

</details>

<details>
<summary><b>💻 Replit Deployment (Development)</b></summary>

### Replit Setup

1. **Import to Replit:**
   - Click "Import from GitHub"
   - Paste repository URL
   - Replit auto-configures from `replit.md`

2. **Environment Secrets:**
   - Click "Secrets" in sidebar
   - Add:
   ```
   SESSION_ID = your_session_id
   OWNER_NUMBERS = your_number
   ```

3. **Run:**
   - Click "Run" button
   - Bot starts automatically
   - Scan QR if no SESSION_ID set

✅ **Perfect for testing!**

**Note:** Replit works great without database - data is temporary until you add MongoDB URL.

</details>

---

## 🔧 Local Installation

### Option 1: Quick Setup (Recommended)

```bash
# Clone repository
git clone https://github.com/NexusCoders-cyber/Amazing-Bot-.git
cd Amazing-Bot-

# Install dependencies
npm install

# Setup environment
cp .env.example .env
nano .env  # Edit with your configuration

# Start bot
npm start
```

### Option 2: Manual Setup

```bash
# Download and extract
wget https://github.com/NexusCoders-cyber/Amazing-Bot-/archive/main.zip
unzip main.zip
cd Amazing-Bot--main

# Install dependencies
npm install

# Configure
cp .env.example .env

# Start
npm start
```

---

## ⚙️ Configuration

### 🔑 Essential Variables

Create `.env` file with these required settings:

```env
# ============================================
# WhatsApp Configuration (Required)
# ============================================
SESSION_ID=Ilom~base64_encoded_session_here
OWNER_NUMBERS=1234567890,9876543210
PREFIX=.
BOT_NAME=Amazing Bot

# ============================================
# Database Configuration (Optional)
# ============================================
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/botdb
DATABASE_ENABLED=true

# ============================================
# AI Integration (Optional)
# ============================================
OPENAI_API_KEY=sk-your-openai-api-key-here
GEMINI_API_KEY=your-google-gemini-api-key
OPENAI_MODEL=gpt-3.5-turbo

# ============================================
# Security (Recommended)
# ============================================
ENCRYPTION_KEY=your-secure-encryption-key-min-32-chars
JWT_SECRET=your-jwt-secret-key-here
SESSION_SECRET=your-session-secret-here

# ============================================
# Bot Behavior
# ============================================
PUBLIC_MODE=true
SELF_MODE=false
AUTO_READ=false
AUTO_TYPING=true
MARK_ONLINE=true

# ============================================
# Performance
# ============================================
MAX_CONCURRENT_COMMANDS=50
COMMAND_COOLDOWN=3
RATE_LIMIT_REQUESTS=20
CACHE_SIZE=1000
```

### 📱 Getting SESSION_ID

#### Method 1: QR Code (Easiest)
```bash
# Start bot without SESSION_ID
npm start

# Scan QR code with WhatsApp
# SESSION_ID will be saved automatically
```

#### Method 2: From Running Bot
```bash
# Check logs after successful QR scan
# Copy SESSION_ID from terminal/logs
# Add to .env file
```

### 🗄️ Database Setup

#### Without Database (Quick Start)
```env
# Leave MONGODB_URL empty or use default
MONGODB_URL=mongodb://localhost:27017/ilombot

# Bot will work with temporary data
# Perfect for testing and Replit
```

#### With MongoDB (Production)

**Option 1: MongoDB Atlas (Free)**
1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Get connection string
4. Add to `.env`:
```env
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/botdb
```

**Option 2: Local MongoDB**
```env
MONGODB_URL=mongodb://localhost:27017/ilombot
```

**Option 3: Platform Managed**
- Railway, Render, Heroku offer managed databases
- Auto-inject connection strings

---

<div align="center">
<img src="./attached_assets/stock_images/digital_features_das_94b4fbc4.jpg" alt="Bot Features Dashboard" width="100%" style="border-radius: 10px; margin: 20px 0;">
</div>

## ✨ Features

<div align="center">

### 🎯 Core Capabilities

| Category | Features | Count |
|----------|----------|-------|
| 🤖 **AI & Chat** | OpenAI GPT, Gemini, Smart Responses | 15+ |
| 🎮 **Games** | 8-ball, Trivia, Blackjack, Hangman | 12+ |
| 💰 **Economy** | Currency, Daily Rewards, Gambling, Shop | 18+ |
| 👑 **Admin** | Group Management, Moderation, Bans | 20+ |
| 📥 **Downloaders** | YouTube, Instagram, TikTok, Facebook | 10+ |
| 🔧 **Utilities** | QR, Encryption, Translate, Weather | 15+ |
| 🎨 **Media** | Stickers, Filters, Compress, Convert | 12+ |
| 🌐 **Info** | News, Search, Dictionary, Time | 10+ |
| 👤 **Owner** | System Control, Backup, Execute Code | 9+ |

**Total: 142+ Commands** loaded and tested!

</div>

### 🚀 Advanced Capabilities

<table>
<tr>
<td width="33%">

#### 🔐 Security
- Multi-level permissions
- Rate limiting
- Input validation
- Session encryption
- JWT authentication
- Credential sanitization

</td>
<td width="33%">

#### ⚡ Performance
- Sub-100ms responses
- Efficient caching
- Database pooling
- Async processing
- Memory optimization
- Queue management

</td>
<td width="33%">

#### 🌐 Platform Support
- Universal compatibility
- Cloud-native design
- Auto-scaling ready
- Zero-downtime updates
- Health monitoring
- Multi-platform deploy

</td>
</tr>
</table>

### 💡 Smart Features

- **🔄 Auto-Recovery** - Reconnects automatically after errors
- **📊 Real-time Stats** - Live performance monitoring
- **🌍 Multi-Language** - 10+ languages with auto-detection
- **🎨 Canvas Graphics** - Professional welcome/goodbye/level-up cards
- **💾 Smart Storage** - Works with or without database
- **🔔 Notifications** - Owner alerts for important events
- **📈 Analytics** - Usage tracking and insights
- **🛡️ Anti-Spam** - Smart spam detection and prevention
- **⚡ Auto-Reaction** - Context-aware message reactions
- **🎯 Leveling System** - XP-based progression with rewards

---

## 📖 Command Guide

### ✨ Enhanced Help Command

The bot now features a **stylish, user-personalized help menu** with:

- **🎯 User Information Display** - Shows your name, ID, status, credits, and more
- **⚡ Real-time Stats** - Current date, time, and bot status
- **📱 Interactive Buttons** - Quick access to owner, support, and stats
- **💬 Reply Support** - Reply to command help for detailed assistance
- **🎨 Beautiful Formatting** - Clean, organized command categories
- **🌐 Global Image Support** - Thumbnails for enhanced visual appeal

#### Example Help Menu Output:
```
╭──⦿【 ⚡ ILOM BOT 】
│ 🎯 𝗨𝘀𝗲𝗿: Your Name
│ 🔰 𝗜𝗗: @your_id
│ 👑 𝗦𝘁𝗮𝘁𝘂𝘀: PREMIUM ELITE / FREE USER
│ ⚡ 𝗣𝗼𝘄𝗲𝗿: UNLIMITED ACCESS / LIMITED ACCESS
│ 💎 𝗖𝗿𝗲𝗱𝗶𝘁𝘀: ∞ INFINITE / Balance
│ 🌐 𝗣𝗿𝗲𝗳𝗶𝘅: .
│ 🤖 𝗦𝘆𝘀𝘁𝗲𝗺: Bot Name v1.0.0
│ 👨‍💻 𝗖𝗿𝗲𝗮𝘁𝗼𝗿: Ilom
│ 🔄 𝗦𝘁𝗮𝘁𝘂𝘀: ONLINE & ACTIVE
│ 📅 𝗗𝗮𝘁𝗲: DD/MM/YYYY
│ 📆 𝗗𝗮𝘆: Day Name
│ ⏰ 𝗧𝗶𝗺𝗲: HH:MM:SS AM/PM UTC
╰────────⦿
```

### 🎯 Essential Commands

```bash
.help              # Display all available commands with user info
.help <command>    # Get detailed info about a specific command
.menu              # Interactive command menu
.ping              # Check bot response time
.info              # Detailed bot information
.status            # System performance stats
.support           # Join support group
```

### 👑 Admin Commands

<details>
<summary><b>Group Management</b></summary>

```bash
.kick @user          # Remove member from group
.ban @user           # Ban user permanently
.unban @user         # Remove ban
.promote @user       # Promote to admin (with canvas card)
.demote @user        # Remove admin rights (with canvas card)
.mute @user [time]   # Mute user temporarily
.unmute @user        # Unmute user
.warn @user          # Issue warning
.unwarn @user        # Remove warning
.tagall [message]    # Mention all members
.hidetag [message]   # Hidden mention all
.setdesc <text>      # Change description (with notification)
.setname <text>      # Change group name (with notification)
.groupinfo           # Get group details
.antilink on/off     # Enable/disable link protection
```

</details>

### 🧠 AI Integration

<details>
<summary><b>AI Commands</b></summary>

```bash
.ai <message>        # Chat with AI assistant
.chatgpt <message>   # OpenAI GPT chat
.gemini <message>    # Google Gemini chat
.analyze <text>      # Analyze content with AI
.translate <text>    # Translate to any language
.imagine <prompt>    # Generate AI images
.stt [audio]         # Speech to text
.tts <text>          # Text to speech
.ocr [image]         # Extract text from image
```

</details>

### 💰 Economy System

<details>
<summary><b>Money & Shop</b></summary>

```bash
.balance             # Check your balance
.daily               # Claim daily reward ($100-500)
.weekly              # Claim weekly reward ($1000-5000)
.work                # Work to earn money
.gamble <amount>     # Take your chances
.rob @user           # Rob another user (risky!)
.transfer @user <$>  # Send money to user
.shop                # View available items
.buy <item>          # Purchase item
.inventory           # Check your inventory
.sell <item>         # Sell item from inventory
.leaderboard         # View richest users
```

</details>

### 🎮 Games & Fun

<details>
<summary><b>Entertainment</b></summary>

```bash
# Quick Games
.8ball <question>    # Magic 8-ball predictions
.dice [sides]        # Roll dice (default 6)
.coin                # Flip a coin
.rps <choice>        # Rock, paper, scissors
.joke                # Random jokes
.quote               # Inspirational quotes

# Interactive Games
.trivia              # Start trivia quiz
.blackjack           # Play blackjack
.tictactoe           # Play tic-tac-toe
.hangman             # Play hangman
.math                # Math quiz game
.word                # Word puzzle game
.memory              # Memory game
```

</details>

### 📥 Downloaders

<details>
<summary><b>Social Media Downloads</b></summary>

```bash
# Video/Audio
.ytdl <url>          # YouTube video/audio
.ytmp3 <url>         # YouTube audio only
.ytmp4 <url>         # YouTube video only

# Social Media
.igdl <url>          # Instagram media
.fbdl <url>          # Facebook video
.tikdl <url>         # TikTok video
.twdl <url>          # Twitter media
.pinterest <url>     # Pinterest media

# File Hosting
.mediafire <url>     # MediaFire files
.gdrive <url>        # Google Drive files
```

</details>

### 🎨 Media Processing

<details>
<summary><b>Image & Video Tools</b></summary>

```bash
# Image Processing
.sticker             # Convert to sticker
.filter <type>       # Apply image filter
.blur                # Blur image
.compress            # Compress image
.resize <width>      # Resize image
.crop                # Crop image
.watermark           # Add watermark
.meme <text>         # Create meme

# Format Conversion
.toaudio             # Video → Audio
.toimg               # Sticker → Image
.tovideo             # Image → Video
.gif                 # Video → GIF
```

</details>

### 🔧 Utilities

<details>
<summary><b>Useful Tools</b></summary>

```bash
# Tools
.qr <text>           # Generate QR code
.encrypt <text>      # Encrypt text
.decrypt <text>      # Decrypt text
.hash <text>         # Generate hash
.base64 <text>       # Base64 encode/decode
.short <url>         # Shorten URL

# Information
.weather <city>      # Weather forecast
.news                # Latest news
.search <query>      # Web search
.time                # Current time
.uptime              # Bot uptime
.profile [@user]     # User profile
```

</details>

### 🔒 Owner Commands

<details>
<summary><b>System Management</b></summary>

```bash
# Bot Control
.restart             # Restart bot
.shutdown            # Shutdown bot
.update              # Update from GitHub
.backup              # Create backup
.restore             # Restore from backup

# Code Execution
.eval <code>         # Execute JavaScript
.exec <command>      # Execute system command

# Configuration
.setprefix <prefix>  # Change command prefix
.setstatus <text>    # Set bot status
.setpp [image]       # Set profile picture
.broadcast <msg>     # Broadcast to all chats
.join <invite_link>  # Join group
.leave               # Leave current group

# User Management
.addpremium @user    # Grant premium
.removepremium @user # Remove premium
.gban @user          # Global ban
.gunban @user        # Global unban
```

</details>

---

## 🎨 Canvas-Based Group Events

The bot features **professional visual notifications** using canvas graphics:

### Welcome Messages
- Beautiful gradient backgrounds with user avatars
- Personalized greeting with username
- Member count display
- Custom group name integration

### Goodbye Messages
- Stylish farewell cards with user info
- Differentiation between leave and kick
- Admin attribution for kicks
- Updated member count

### Promotion/Demotion
- Celebration-themed promotion cards
- Professional demotion notifications
- Admin attribution
- Visual role indicators

### Group Updates
- Name change notifications with old vs new comparison
- Description update cards
- Visual before/after displays
- Admin attribution

### Level-Up System
- XP-based progression tracking
- Beautiful level-up cards with achievements
- Configurable XP multipliers
- Reward system integration

### Auto-Reactions
- 20+ context-aware emoji reactions
- Keyword-based triggers
- Smart sentiment analysis
- Customizable reaction sets

---

## 🌐 API Reference

### Base URL
```
http://localhost:5000/api
```

### 📊 Health & Monitoring

#### Health Check
```http
GET /api/health
```
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-03T00:00:00.000Z",
  "uptime": "5h 23m 15s",
  "memory": {
    "used": "45.2 MB",
    "total": "512 MB"
  },
  "whatsapp": {
    "connected": true,
    "qr_scanned": true
  },
  "database": {
    "connected": true,
    "type": "mongodb"
  }
}
```

#### System Statistics
```http
GET /api/stats
```

#### QR Code
```http
GET /api/qr
```
Returns current QR code image for WhatsApp pairing.

### 🤖 Bot Management

```http
GET  /api/commands        # List all commands
GET  /api/commands/stats  # Command statistics
GET  /api/users           # User management
GET  /api/groups          # Group management
POST /api/messages        # Send messages
```

### 🔐 Authentication

```http
POST /api/auth/login      # Login to dashboard
POST /api/auth/refresh    # Refresh token
GET  /api/auth/session    # Get session info
```

### 📈 Analytics

```http
GET /api/analytics/usage       # Usage analytics
GET /api/analytics/commands    # Command analytics
GET /api/analytics/performance # Performance metrics
```

---

## 🔧 Troubleshooting

### Common Issues

<details>
<summary><b>❌ MongoDB Connection Timeout</b></summary>

**Problem:** `Operation users.findOne() buffering timed out after 10000ms`

**✅ Solution:** 
This is now automatically handled! The bot will:
- Use real database if connected
- Use temporary data if database unavailable
- No timeout errors sent to your WhatsApp

**For production:**
```env
# Add valid MongoDB URL
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/botdb
```

**For testing without database:**
```env
# Leave empty or use localhost
MONGODB_URL=mongodb://localhost:27017/ilombot
```

</details>

<details>
<summary><b>❌ Canvas/Graphics Not Working</b></summary>

**Problem:** Canvas images not generating for group events

**✅ Solution:**
Ensure canvas dependencies are installed:
```bash
# For Linux/Ubuntu
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# For macOS
brew install pkg-config cairo pango libpng jpeg giflib librsvg

# Reinstall node-canvas
npm install canvas --build-from-source
```

</details>

<details>
<summary><b>❌ Commands Not Working</b></summary>

**Problem:** Bot doesn't respond to commands

**✅ Solution:**
1. Check prefix is correct in `.env` file
2. Verify bot is running: `npm start`
3. Check logs for errors: `tail -f logs/bot.log`
4. Ensure you have permission to use the command
5. Test with basic command: `.ping`

</details>

---

## 📚 Documentation

- [📖 Command Template Guide](./COMMAND_TEMPLATE.md) - Create custom commands
- [🎨 Canvas Utils Documentation](./docs/canvas-utils.md) - Graphics API
- [🔌 Plugin Development](./docs/plugins.md) - Build plugins
- [🌐 API Reference](./docs/api-reference.md) - Complete API docs
- [🚀 Deployment Guide](./docs/deployment.md) - Production setup

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 💬 Support

Need help? Join our community:

<div align="center">

[![WhatsApp Group](https://img.shields.io/badge/WhatsApp-Group-25D366?style=for-the-badge&logo=whatsapp)](https://chat.whatsapp.com/your-group-link)
[![Telegram](https://img.shields.io/badge/Telegram-Channel-26A5E4?style=for-the-badge&logo=telegram)](https://t.me/your-channel)
[![Discord](https://img.shields.io/badge/Discord-Server-5865F2?style=for-the-badge&logo=discord)](https://discord.gg/your-server)
[![GitHub Issues](https://img.shields.io/badge/GitHub-Issues-181717?style=for-the-badge&logo=github)](https://github.com/NexusCoders-cyber/Amazing-Bot-/issues)

</div>

---

## 👨‍💻 Author

**Ilom** - *Lead Developer*

- GitHub: [@NexusCoders-cyber](https://github.com/NexusCoders-cyber)
- WhatsApp: [Contact](https://wa.me/your-number)

---

## 🙏 Acknowledgments

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [OpenAI](https://openai.com) - AI Integration
- [Google Gemini](https://ai.google.dev) - AI Services
- All contributors and supporters

---

<div align="center">

### ⭐ Star this repository if you find it helpful!

**Made with ❤️ by Ilom & NexusCoders**

</div>
