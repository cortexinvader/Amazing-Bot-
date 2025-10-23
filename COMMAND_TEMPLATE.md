<div align="center">

# ✨ Amazing Bot 🧠 Command Template ✨
### *Made by Ilom*

<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=32&duration=2800&pause=2000&color=A020F0&center=true&vCenter=true&width=940&lines=Create+Powerful+WhatsApp+Commands;Build+Amazing+Bot+Features;Unlock+Unlimited+Possibilities" alt="Typing Animation" />

---

[![Bot Version](https://img.shields.io/badge/Version-1.0.0-blueviolet?style=for-the-badge&logo=whatsapp)](https://github.com/NexusCoders-cyber/Amazing-Bot-)
[![Made with Love](https://img.shields.io/badge/Made%20with-❤️-ff69b4?style=for-the-badge)](https://github.com/NexusCoders-cyber/Amazing-Bot-)
[![Powered by Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-success?style=for-the-badge)](LICENSE)

*Complete guide for creating custom commands in Amazing WhatsApp Bot*

[Basic Structure](#-basic-command-structure) • [Properties](#-command-properties) • [Advanced Features](#-advanced-features) • [Examples](#-complete-examples) • [Best Practices](#-best-practices) • [Button Support](#-button-support)

</div>

---

## 🎯 Basic Command Structure

Every command must follow this structure:

```javascript
export default {
    name: 'commandname',
    aliases: ['alias1', 'alias2'],
    category: 'general',
    description: 'Brief description of what this command does',
    usage: '.commandname [arguments]',
    example: '.commandname hello world',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 10,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    adminOnly: false,
    groupOnly: false,
    botAdminRequired: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: false,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        await sock.sendMessage(from, {
            text: 'Your response here'
        }, { quoted: message });
    }
};
```

---

## 📝 Command Properties

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | String | Unique command identifier (lowercase, no spaces) |
| `execute` | Function | Main function that runs when command is called |

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `aliases` | Array | `[]` | Alternative names for the command |
| `category` | String | `'general'` | Command category (admin, ai, downloader, economy, fun, games, general, media, owner, utility) |
| `description` | String | `''` | Brief explanation of command functionality |
| `usage` | String | `name` | How to use the command |
| `example` | String | `name` | Example usage |
| `cooldown` | Number | `3` | Seconds before user can use command again |
| `permissions` | Array | `['user']` | Required permissions (owner, admin, premium, user) |
| `args` | Boolean | `false` | Whether command requires arguments |
| `minArgs` | Number | `0` | Minimum number of arguments required |
| `maxArgs` | Number | `Infinity` | Maximum number of arguments allowed |
| `typing` | Boolean | `true` | Show typing indicator when executing |
| `premium` | Boolean | `false` | Only premium users can use |
| `hidden` | Boolean | `false` | Hide from help menu |
| `ownerOnly` | Boolean | `false` | Only bot owner/sudo users can use (recommended for owner category) |
| `adminOnly` | Boolean | `false` | Only group admins can use (recommended for admin category) |
| `groupOnly` | Boolean | `false` | Only works in groups (required for admin commands) |
| `botAdminRequired` | Boolean | `false` | Bot needs admin rights (required for promote/demote/kick) |
| `supportsReply` | Boolean | `false` | Enable reply handler |
| `supportsChat` | Boolean | `false` | Enable chat context |
| `supportsReact` | Boolean | `false` | Enable reaction handler |
| `supportsButtons` | Boolean | `false` | Command can send buttons |

### Important Notes on Permission Flags

- **Owner Commands**: Always set `ownerOnly: true`. Sudo users (bot admins) automatically get access to owner commands.
- **Admin Commands**: Always set `groupOnly: true` and `adminOnly: true`. Add `botAdminRequired: true` if the command requires bot to have admin privileges (like kick, promote, demote).
- **Database Integration**: Economy commands use User model methods like `addBalance()`, `addXP()`, etc. for database operations.
- **Google Fonts**: canvasUtils now supports Google Fonts API fallback if local fonts are missing. Fonts are cached in `cache/fonts/`.

### Execute Function Parameters

The `execute` function receives an object with these properties:

```javascript
{
    sock,           // WhatsApp socket connection
    message,        // Full message object
    args,           // Command arguments array
    command,        // Command object (this)
    user,           // User database object
    group,          // Group database object (if in group)
    from,           // Chat ID (group or private)
    sender,         // Sender's WhatsApp ID
    isGroup,        // Boolean: is this a group chat?
    isGroupAdmin,   // Boolean: is sender a group admin?
    isBotAdmin,     // Boolean: is bot a group admin?
    isOwner,        // Boolean: is sender the bot owner?
    prefix,         // Command prefix (.)
    quoted,         // Quoted message (if any)
    body            // Full message body
}
```

---

## 🎨 Advanced Features

### 1. Quoted Messages (REQUIRED)

ALL COMMANDS MUST USE QUOTED MESSAGES:

```javascript
await sock.sendMessage(from, {
    text: 'Your response'
}, { quoted: message });
```

### 2. Canvas Graphics

Create beautiful images for your commands:

```javascript
import { createCanvas, loadImage } from 'canvas';
import { applyGradient, roundRect } from '../utils/canvasUtils.js';

export default {
    name: 'profile',
    category: 'utility',
    description: 'Generate profile card',
    
    async execute({ sock, message, from, sender, user }) {
        try {
            const canvas = createCanvas(800, 400);
            const ctx = canvas.getContext('2d');
            
            applyGradient(ctx, 800, 400, '#667eea', '#764ba2');
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 48px Arial';
            ctx.fillText('Profile Card', 50, 80);
            
            ctx.font = '32px Arial';
            ctx.fillText(`User: ${sender.split('@')[0]}`, 50, 150);
            ctx.fillText(`Balance: $${user.economy.balance}`, 50, 200);
            
            const buffer = canvas.toBuffer('image/png');
            
            await sock.sendMessage(from, {
                image: buffer,
                caption: '✨ Your profile card!'
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Failed to generate profile card'
            }, { quoted: message });
        }
    }
};
```

### 3. Reply Handler (onReply Method)

Allow users to reply to command output using the onReply method:

```javascript
const activeQuizzes = new Map();

export default {
    name: 'quiz',
    category: 'games',
    description: 'Answer quiz questions',
    
    async execute({ sock, message, from, sender, prefix }) {
        if (activeQuizzes.has(from)) {
            return sock.sendMessage(from, {
                text: `❌ A quiz is already active!`
            }, { quoted: message });
        }

        const question = {
            text: "What is 2 + 2?",
            answer: 4
        };
        
        activeQuizzes.set(from, {
            question,
            sender,
            startTime: Date.now()
        });

        await sock.sendMessage(from, {
            text: `🎯 *QUIZ TIME!*\n\n${question.text}\n\n💡 Reply with your answer!`
        }, { quoted: message });

        setTimeout(() => {
            if (activeQuizzes.has(from)) {
                activeQuizzes.delete(from);
                sock.sendMessage(from, {
                    text: `⏰ Time's up!`
                }, { quoted: message });
            }
        }, 30000);
    },
    
    async onReply({ sock, message, from, sender, text }) {
        const quizData = activeQuizzes.get(from);
        
        if (!quizData) return false;
        
        if (sender !== quizData.sender) {
            await sock.sendMessage(from, {
                text: `❌ Only the quiz starter can answer!`
            }, { quoted: message });
            return true;
        }

        activeQuizzes.delete(from);

        const userAnswer = parseInt(text.trim());
        const isCorrect = userAnswer === quizData.question.answer;

        await sock.sendMessage(from, {
            text: isCorrect ? '✅ Correct!' : '❌ Wrong!',
            mentions: [sender]
        }, { quoted: message });

        return true;
    }
};
```

### 4. Chat Context Handler (supportsChat: true)

Maintain conversation context:

```javascript
export default {
    name: 'story',
    supportsChat: true,
    
    async execute({ sock, message, from, sender }) {
        this.setupChatHandler(sock, from, sender);
        
        await sock.sendMessage(from, {
            text: '📖 Story Mode Activated!\n\nTell me a genre (fantasy, sci-fi, horror):'
        }, { quoted: message });
    },
    
    setupChatHandler(sock, from, sender) {
        const chatTimeout = setTimeout(() => {
            if (global.chatHandlers) {
                delete global.chatHandlers[sender];
            }
        }, 300000);
        
        if (!global.chatHandlers) {
            global.chatHandlers = {};
        }
        
        global.chatHandlers[sender] = {
            command: this.name,
            step: 'genre',
            data: {},
            timeout: chatTimeout,
            handler: async (text, message) => {
                const handler = global.chatHandlers[sender];
                
                if (handler.step === 'genre') {
                    handler.data.genre = text;
                    handler.step = 'character';
                    await sock.sendMessage(from, {
                        text: `Great! ${text} story it is! Now give me a character name:`
                    }, { quoted: message });
                } else if (handler.step === 'character') {
                    handler.data.character = text;
                    
                    await sock.sendMessage(from, {
                        text: `📚 Story:\n\nOnce upon a time, ${handler.data.character} lived in a ${handler.data.genre} world...`
                    }, { quoted: message });
                    
                    clearTimeout(chatTimeout);
                    delete global.chatHandlers[sender];
                }
            }
        };
    }
};
```

### 5. Reaction Handler (supportsReact: true)

Allow users to react to messages for confirmation with automatic category detection:

```javascript
import fs from 'fs-extra';
import path from 'path';

export default {
    name: 'file',
    category: 'owner',
    description: 'Create or replace command file with reaction confirmation',
    usage: 'file <category/filename.js> | <content>',
    ownerOnly: true,
    supportsReact: true,
    
    async execute({ sock, message, args, from, sender }) {
        const fullText = args.join(' ');
        const [filePath, ...contentParts] = fullText.split('|');
        const fileContent = contentParts.join('|').trim();
        const cleanPath = filePath.trim();
        
        const validCategories = ['admin', 'ai', 'downloader', 'economy', 'fun', 'games', 'general', 'media', 'owner', 'utility'];
        let category = '';
        let filename = '';
        
        if (cleanPath.includes('/')) {
            const parts = cleanPath.split('/');
            category = parts[0].toLowerCase();
            filename = parts[parts.length - 1];
        } else {
            filename = cleanPath;
        }
        
        if (category && !validCategories.includes(category)) {
            return await sock.sendMessage(from, {
                text: `❌ *Invalid Category*\n\n"${category}" is not valid.\n\n*Valid:* ${validCategories.join(', ')}`
            }, { quoted: message });
        }
        
        if (!filename.endsWith('.js')) filename += '.js';
        
        const finalPath = category 
            ? path.join(process.cwd(), 'src', 'commands', category, filename)
            : path.join(process.cwd(), cleanPath);
        
        const displayPath = category 
            ? `src/commands/${category}/${filename}`
            : cleanPath;
        
        const fileExists = await fs.pathExists(finalPath);
        
        if (fileExists) {
            const confirmMsg = await sock.sendMessage(from, {
                text: `⚠️ *File Already Exists*\n\n*Path:* ${displayPath}\n*Category:* ${category}\n\nReact:\n✅ - Replace\n❌ - Cancel`
            }, { quoted: message });
            
            await sock.sendMessage(from, {
                react: { text: '✅', key: confirmMsg.key }
            });
            await sock.sendMessage(from, {
                react: { text: '❌', key: confirmMsg.key }
            });
            
            this.setupReactionHandler(sock, from, confirmMsg.key.id, sender, finalPath, fileContent, displayPath, category);
        } else {
            await fs.ensureDir(path.dirname(finalPath));
            await fs.writeFile(finalPath, fileContent, 'utf8');
            
            await sock.sendMessage(from, {
                text: `✅ *File Created*\n\n*Path:* ${displayPath}\n*Category:* ${category}\n*Size:* ${fileContent.length} bytes`,
                mentions: [sender]
            }, { quoted: message });
        }
    },
    
    setupReactionHandler(sock, from, messageId, sender, filePath, fileContent, displayPath, category) {
        const reactionTimeout = setTimeout(() => {
            if (global.reactHandlers?.[messageId]) {
                delete global.reactHandlers[messageId];
            }
        }, 60000);
        
        if (!global.reactHandlers) global.reactHandlers = {};
        
        global.reactHandlers[messageId] = {
            command: this.name,
            timeout: reactionTimeout,
            handler: async (reactionEmoji, reactSender) => {
                if (reactSender !== sender) return;
                clearTimeout(reactionTimeout);
                
                if (reactionEmoji === '✅') {
                    await fs.writeFile(filePath, fileContent, 'utf8');
                    await sock.sendMessage(from, {
                        text: `✅ *File Replaced*\n\n*Path:* ${displayPath}\n*Category:* ${category}`
                    });
                } else if (reactionEmoji === '❌') {
                    await sock.sendMessage(from, {
                        text: `❌ *Cancelled*\n\nFile not modified.`
                    });
                }
                
                delete global.reactHandlers[messageId];
            }
        };
    }
};
```

### 6. Button Support (supportsButtons: true)

Send interactive buttons:

```javascript
export default {
    name: 'settings',
    supportsButtons: true,
    
    async execute({ sock, message, from, prefix }) {
        const buttons = [
            { buttonId: `${prefix}settings language`, buttonText: { displayText: '🌐 Language' }, type: 1 },
            { buttonId: `${prefix}settings theme`, buttonText: { displayText: '🎨 Theme' }, type: 1 },
            { buttonId: `${prefix}settings notifications`, buttonText: { displayText: '🔔 Notifications' }, type: 1 }
        ];
        
        await sock.sendMessage(from, {
            text: '⚙️ Bot Settings\n\nChoose a setting to configure:',
            footer: '© Amazing Bot',
            buttons: buttons,
            headerType: 1
        }, { quoted: message });
    }
};
```

### 7. Database Integration

Work with user and group data:

```javascript
import { getUser, updateUser } from '../models/User.js';
import { getGroup, updateGroup } from '../models/Group.js';

export default {
    name: 'balance',
    category: 'economy',
    description: 'Check your balance',
    
    async execute({ sock, message, from, sender, user }) {
        const balanceText = `
╭──⦿【 💰 BALANCE 】
│
│ 👤 User: @${sender.split('@')[0]}
│ 💵 Balance: $${user.economy.balance}
│ 🏦 Bank: $${user.economy.bank}
│ 💎 Total: $${user.economy.balance + user.economy.bank}
│ 📊 Level: ${user.level}
│ ⭐ XP: ${user.xp}/${user.level * 100}
│
╰────────⦿`;
        
        await sock.sendMessage(from, {
            text: balanceText,
            mentions: [sender]
        }, { quoted: message });
    }
};
```

### 8. External API Integration

Fetch data from external services:

```javascript
import axios from 'axios';

export default {
    name: 'weather',
    category: 'utility',
    description: 'Get weather information',
    usage: '.weather <city>',
    cooldown: 5,
    minArgs: 1,
    
    async execute({ sock, message, from, args }) {
        try {
            const city = args.join(' ');
            const response = await axios.get(`https://api.weatherapi.com/v1/current.json`, {
                params: {
                    key: process.env.WEATHER_API_KEY,
                    q: city
                }
            });
            
            const data = response.data;
            const weatherText = `
╭──⦿【 🌤️ WEATHER 】
│
│ 📍 Location: ${data.location.name}, ${data.location.country}
│ 🌡️ Temperature: ${data.current.temp_c}°C
│ ☁️ Condition: ${data.current.condition.text}
│ 💨 Wind: ${data.current.wind_kph} km/h
│ 💧 Humidity: ${data.current.humidity}%
│
╰────────⦿`;
            
            await sock.sendMessage(from, {
                text: weatherText
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Failed to fetch weather data'
            }, { quoted: message });
        }
    }
};
```

### 9. Media Processing

Handle images, videos, and stickers:

```javascript
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { createSticker } from '../utils/stickerUtils.js';

export default {
    name: 'sticker',
    category: 'media',
    description: 'Create sticker from image',
    
    async execute({ sock, message, from, quoted }) {
        try {
            if (!quoted?.imageMessage) {
                return await sock.sendMessage(from, {
                    text: '❌ Please reply to an image'
                }, { quoted: message });
            }
            
            const buffer = await downloadMediaMessage(message, 'buffer', {});
            const sticker = await createSticker(buffer);
            
            await sock.sendMessage(from, {
                sticker: sticker
            });
        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Failed to create sticker'
            }, { quoted: message });
        }
    }
};
```

---

## 📚 Complete Examples

### Example 1: Simple Greeting Command

```javascript
export default {
    name: 'hello',
    aliases: ['hi', 'hey'],
    category: 'fun',
    description: 'Greet the bot',
    usage: '.hello',
    cooldown: 2,
    
    async execute({ sock, message, from, sender }) {
        const greetings = [
            '👋 Hello there!',
            '🎉 Hey! How can I help?',
            '😊 Hi! Nice to see you!',
            '🌟 Greetings! Welcome!'
        ];
        
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        
        await sock.sendMessage(from, {
            text: `${randomGreeting}\n\nUser: @${sender.split('@')[0]}`,
            mentions: [sender]
        }, { quoted: message });
    }
};
```

### Example 2: Calculator Command

```javascript
import mathjs from 'mathjs';

export default {
    name: 'calculator',
    aliases: ['calc', 'math'],
    category: 'utility',
    description: 'Perform mathematical calculations',
    usage: '.calc <expression>',
    example: '.calc 2 + 2 * 3',
    cooldown: 2,
    minArgs: 1,
    
    async execute({ sock, message, from, args }) {
        try {
            const expression = args.join(' ');
            const result = mathjs.evaluate(expression);
            
            const calcText = `
╭──⦿【 🧮 CALCULATOR 】
│
│ 📝 Expression: ${expression}
│ ✅ Result: ${result}
│
╰────────⦿`;
            
            await sock.sendMessage(from, {
                text: calcText
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Invalid mathematical expression!'
            }, { quoted: message });
        }
    }
};
```

### Example 3: Kick Command (Admin)

```javascript
export default {
    name: 'kick',
    aliases: ['remove'],
    category: 'admin',
    description: 'Remove a member from the group',
    usage: '.kick @user',
    cooldown: 3,
    adminOnly: true,
    groupOnly: true,
    botAdminRequired: true,
    
    async execute({ sock, message, from, isGroupAdmin, isBotAdmin }) {
        if (!isGroupAdmin) {
            return sock.sendMessage(from, {
                text: '❌ You need to be a group admin to use this command!'
            }, { quoted: message });
        }
        
        if (!isBotAdmin) {
            return sock.sendMessage(from, {
                text: '❌ Bot needs to be admin to kick users!'
            }, { quoted: message });
        }
        
        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        
        if (!mentioned || mentioned.length === 0) {
            return sock.sendMessage(from, {
                text: '❌ Please mention a user to kick!'
            }, { quoted: message });
        }
        
        await sock.groupParticipantsUpdate(from, mentioned, 'remove');
        
        await sock.sendMessage(from, {
            text: `✅ User removed successfully!`,
            mentions: mentioned
        }, { quoted: message });
    }
};
```

### Example 4: Daily Reward Command

```javascript
import { getUser, updateUser } from '../models/User.js';

export default {
    name: 'daily',
    category: 'economy',
    description: 'Claim daily reward',
    usage: '.daily',
    cooldown: 86400,
    
    async execute({ sock, message, from, sender, user }) {
        const now = Date.now();
        const lastDaily = user.economy.lastDaily || 0;
        const cooldown = 86400000;
        
        if (now - lastDaily < cooldown) {
            const remaining = cooldown - (now - lastDaily);
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            
            return await sock.sendMessage(from, {
                text: `⏰ You already claimed your daily reward!\n\n⏳ Next claim in: ${hours}h ${minutes}m`
            }, { quoted: message });
        }
        
        const reward = Math.floor(Math.random() * 400) + 100;
        
        await updateUser(sender, {
            'economy.balance': user.economy.balance + reward,
            'economy.lastDaily': now
        });
        
        const dailyText = `
╭──⦿【 🎁 DAILY REWARD 】
│
│ 👤 User: @${sender.split('@')[0]}
│ 💰 Reward: $${reward}
│ 💵 New Balance: $${user.economy.balance + reward}
│ ⏰ Next Claim: 24 hours
│
╰────────⦿`;
        
        await sock.sendMessage(from, {
            text: dailyText,
            mentions: [sender]
        }, { quoted: message });
    }
};
```

### Example 5: Group Stats Command

```javascript
export default {
    name: 'groupstats',
    aliases: ['gstats'],
    category: 'admin',
    description: 'Show group statistics',
    groupOnly: true,
    
    async execute({ sock, message, from, group }) {
        try {
            const metadata = await sock.groupMetadata(from);
            
            const admins = metadata.participants.filter(p => p.admin).length;
            const members = metadata.participants.length - admins;
            
            const statsText = `
╭──⦿【 📊 GROUP STATS 】
│
│ 📱 Name: ${metadata.subject}
│ 🆔 ID: ${metadata.id}
│ 👥 Total Members: ${metadata.participants.length}
│ 👑 Admins: ${admins}
│ 👤 Members: ${members}
│ 📅 Created: ${new Date(metadata.creation * 1000).toLocaleDateString()}
│ 💬 Total Messages: ${group?.stats?.totalMessages || 0}
│ 🎉 Total Joins: ${group?.stats?.totalJoins || 0}
│ 👋 Total Leaves: ${group?.stats?.totalLeaves || 0}
│
╰────────⦿`;
            
            await sock.sendMessage(from, {
                text: statsText
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Failed to fetch group statistics'
            }, { quoted: message });
        }
    }
};
```

---

## ✅ Best Practices

### 1. Always Use Quoted Messages

```javascript
await sock.sendMessage(from, {
    text: 'Your response'
}, { quoted: message });
```

### 2. Error Handling

Always wrap your code in try-catch blocks:

```javascript
async execute({ sock, message, from, args }) {
    try {
        // Your command logic
    } catch (error) {
        console.error('Command error:', error);
        await sock.sendMessage(from, {
            text: '❌ An error occurred. Please try again.'
        }, { quoted: message });
    }
}
```

### 3. Input Validation

Validate all user inputs:

```javascript
if (!args.length) {
    return await sock.sendMessage(from, {
        text: '❌ Please provide required arguments'
    }, { quoted: message });
}

const amount = parseInt(args[0]);
if (isNaN(amount) || amount <= 0) {
    return await sock.sendMessage(from, {
        text: '❌ Please provide a valid positive number'
    }, { quoted: message });
}
```

### 4. Permission Checks

Always check permissions:

```javascript
if (!isGroupAdmin) {
    return await sock.sendMessage(from, {
        text: '❌ This command requires admin privileges'
    }, { quoted: message });
}
```

### 5. User Feedback

Provide clear feedback:

```javascript
await sock.sendMessage(from, {
    text: '⏳ Processing your request...'
}, { quoted: message });

await sock.sendMessage(from, {
    text: '✅ Task completed successfully!'
}, { quoted: message });
```

### 6. Clean Code Structure

Keep your code organized:

```javascript
async function fetchData(query) {
    // Data fetching logic
}

async function formatResponse(data) {
    // Formatting logic
}

export default {
    name: 'search',
    async execute({ sock, message, from, args }) {
        const data = await fetchData(args.join(' '));
        const formatted = formatResponse(data);
        await sock.sendMessage(from, { text: formatted }, { quoted: message });
    }
};
```

### 7. Use Mentions for User-Specific Responses

```javascript
await sock.sendMessage(from, {
    text: `✅ @${sender.split('@')[0]} completed the task!`,
    mentions: [sender]
}, { quoted: message });
```

### 8. Implement Rate Limiting

```javascript
export default {
    name: 'heavycommand',
    cooldown: 10,
    // ...
};
```

### 9. Documentation

Document your commands:

```javascript
/**
 * Command: userinfo
 * Description: Display detailed user information
 * Category: utility
 * Permissions: All users
 * Usage: .userinfo [@user]
 */
export default {
    name: 'userinfo',
    // ...
};
```

### 10. Testing

Test commands in:
- Private chats
- Group chats
- With different permission levels
- With invalid inputs
- With edge cases

---

## 🗂️ File Structure

Save commands in appropriate category folders:

```
src/commands/
├── admin/         # Group management, moderation
├── ai/            # AI-powered features
├── downloader/    # Media downloaders
├── economy/       # Virtual economy system
├── fun/           # Entertainment commands
├── games/         # Interactive games
├── general/       # General utility commands
├── media/         # Media processing
├── owner/         # Owner-only commands
└── utility/       # Developer tools
```

---

## 🔥 Quick Start Template

```javascript
export default {
    name: 'mycommand',
    aliases: [],
    category: 'general',
    description: 'My awesome command',
    usage: '.mycommand [args]',
    cooldown: 3,
    
    async execute({ sock, message, from, args, sender }) {
        try {
            await sock.sendMessage(from, {
                text: 'Hello from my command!'
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ An error occurred'
            }, { quoted: message });
        }
    }
};
```

---

## 🎨 Beautiful Formatting Templates

### Success Message
```javascript
const successText = `
╭──⦿【 ✅ SUCCESS 】
│
│ 🎉 Operation completed!
│ 👤 User: @${sender.split('@')[0]}
│ ⏰ Time: ${new Date().toLocaleTimeString()}
│
╰────────⦿`;
```

### Error Message
```javascript
const errorText = `
╭──⦿【 ❌ ERROR 】
│
│ ⚠️ Something went wrong
│ 📝 ${error.message}
│ 💡 Please try again
│
╰────────⦿`;
```

### Info Message
```javascript
const infoText = `
╭──⦿【 ℹ️ INFORMATION 】
│
│ 📌 Title: ${title}
│ 📄 Description: ${desc}
│ 🔗 More info: ${link}
│
╰────────⦿`;
```

---

## ✨ Amazing Bot Command - Glowing Styling

Create stunning visual effects with glowing text and gradient styling for your commands!

### Glowing Text Command with Canvas

This example creates a command with beautiful glowing neon-style text using canvas:

```javascript
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'fs-extra';
import path from 'path';

export default {
    name: 'amazingbot',
    aliases: ['glow', 'neon', 'shine'],
    category: 'fun',
    description: '✨ Display Amazing Bot with glowing neon effects',
    usage: '.amazingbot [text]',
    example: '.amazingbot Hello World',
    cooldown: 3,
    
    async execute({ sock, message, from, args, sender }) {
        try {
            const text = args.length > 0 ? args.join(' ') : 'AMAZING BOT';
            
            // Create canvas with dark background
            const canvas = createCanvas(1200, 600);
            const ctx = canvas.getContext('2d');
            
            // Dark background with subtle gradient
            const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            bgGradient.addColorStop(0, '#0a0a0a');
            bgGradient.addColorStop(0.5, '#1a1a2e');
            bgGradient.addColorStop(1, '#16213e');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add stars/particles effect
            for (let i = 0; i < 100; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const radius = Math.random() * 2;
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8})`;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Create multiple glowing layers for neon effect
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            // Outer glow (largest)
            ctx.font = 'bold 100px Arial';
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = 80;
            ctx.fillStyle = '#ff00ff';
            ctx.globalAlpha = 0.3;
            ctx.fillText(text, centerX, centerY);
            
            // Middle glow
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 60;
            ctx.fillStyle = '#00ffff';
            ctx.globalAlpha = 0.5;
            ctx.fillText(text, centerX, centerY);
            
            // Inner glow
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 40;
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.7;
            ctx.fillText(text, centerX, centerY);
            
            // Main text with gradient
            const textGradient = ctx.createLinearGradient(
                centerX - 400, centerY - 50,
                centerX + 400, centerY + 50
            );
            textGradient.addColorStop(0, '#ff00ff');
            textGradient.addColorStop(0.33, '#00ffff');
            textGradient.addColorStop(0.66, '#ffff00');
            textGradient.addColorStop(1, '#ff00ff');
            
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 20;
            ctx.fillStyle = textGradient;
            ctx.fillText(text, centerX, centerY);
            
            // Add subtitle
            ctx.font = 'bold 30px Arial';
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#00ffff';
            ctx.fillText('✨ Created by Ilom ✨', centerX, centerY + 100);
            
            // Add decorative elements
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.moveTo(centerX - 500, centerY + 150);
            ctx.lineTo(centerX + 500, centerY + 150);
            ctx.stroke();
            
            // Export image
            const buffer = canvas.toBuffer('image/png');
            
            await sock.sendMessage(from, {
                image: buffer,
                caption: `╭━━━⦿『 ✨ *AMAZING BOT* ✨ 』⦿━━━╮
│
│ 🌟 *Glowing Neon Style*
│ 🎨 *Created with Canvas Magic*
│ 💫 *Powered by Ilom Technology*
│ 
│ 👤 Requested by: @${sender.split('@')[0]}
│
╰━━━━━━━━━━━━━━━━━━━━━━━━╯`,
                mentions: [sender]
            }, { quoted: message });
            
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Failed to create glowing effect\n\n*Error:* ${error.message}`
            }, { quoted: message });
        }
    }
};
```

### Glowing Text-Only Style (No Canvas Required)

For simpler implementations without canvas, use Unicode and formatting:

```javascript
export default {
    name: 'glowtext',
    aliases: ['gtext', 'shine'],
    category: 'fun',
    description: '✨ Display text with glowing ASCII style',
    usage: '.glowtext [message]',
    example: '.glowtext Amazing Bot',
    cooldown: 2,
    
    async execute({ sock, message, from, args, sender }) {
        const text = args.length > 0 ? args.join(' ') : 'AMAZING BOT';
        
        const glowingMessage = `
╔═══════════════════════════════════════╗
║                                       ║
║   ✨ ░█▀▀█ ░█▀▄▀█ ░█▀▀█ ░█▀▀▀█ ░█    ║
║   ✨ ░█▄▄█ ░█░█░█ ░█▄▄█ ░█▄▄▄█ ░█    ║
║   ✨ ░█─░█ ░█──░█ ░█─░█ ░█▄▄▄█ ░█▄▄█ ║
║                                       ║
║          ⭐ ${text.toUpperCase()} ⭐           ║
║                                       ║
║   ════════════════════════════════    ║
║   ╭─『 🌟 GLOWING STYLE 🌟 』─╮       ║
║   │  💎 Amazing Features           │  ║
║   │  ⚡ Lightning Fast             │  ║
║   │  🎨 Beautiful Design            │  ║
║   │  🔥 Powered by Ilom             │  ║
║   ╰────────────────────────────────╯  ║
║                                       ║
║   👤 Created for: @${sender.split('@')[0].substring(0, 20).padEnd(20)}║
║                                       ║
╚═══════════════════════════════════════╝

┌─────────────────────────────────────┐
│  ✨✨✨  SHINE BRIGHT  ✨✨✨       │
│   🌟  Like a Diamond  🌟              │
└─────────────────────────────────────┘`;

        await sock.sendMessage(from, {
            text: glowingMessage,
            mentions: [sender]
        }, { quoted: message });
    }
};
```

### Animated Glowing Progress Bar

Create a dynamic glowing progress bar effect:

```javascript
export default {
    name: 'glowprogress',
    aliases: ['gprogress', 'loading'],
    category: 'fun',
    description: '✨ Display glowing animated progress bar',
    usage: '.glowprogress [task name]',
    example: '.glowprogress Loading Magic',
    cooldown: 3,
    
    async execute({ sock, message, from, args, sender }) {
        const taskName = args.join(' ') || 'Processing';
        
        const frames = [
            { percent: 0, bar: '░░░░░░░░░░░░░░░░░░░░', glow: '✨' },
            { percent: 15, bar: '███░░░░░░░░░░░░░░░░░', glow: '✨💫' },
            { percent: 30, bar: '██████░░░░░░░░░░░░░░', glow: '✨💫⭐' },
            { percent: 50, bar: '██████████░░░░░░░░░░', glow: '✨💫⭐🌟' },
            { percent: 70, bar: '██████████████░░░░░░', glow: '✨💫⭐🌟✨' },
            { percent: 85, bar: '█████████████████░░░', glow: '✨💫⭐🌟✨💫' },
            { percent: 100, bar: '████████████████████', glow: '✨💫⭐🌟✨💫⭐' }
        ];
        
        let sentMsg = null;
        
        for (const frame of frames) {
            const progressText = `
╔═══════════════════════════════════════╗
║  ✨ AMAZING BOT PROGRESS ✨            ║
╠═══════════════════════════════════════╣
║                                       ║
║  🎯 Task: ${taskName.substring(0, 26).padEnd(26)} ║
║                                       ║
║  📊 Progress:                          ║
║  ┌────────────────────────────────┐   ║
║  │ ${frame.bar} │   ║
║  └────────────────────────────────┘   ║
║                                       ║
║  ${frame.percent}% Complete ${frame.glow.padEnd(15)}║
║                                       ║
║  ${frame.percent === 100 ? '✅ Task Completed Successfully!' : '⏳ Please wait...'.padEnd(30)}       ║
║                                       ║
║  👤 User: @${sender.split('@')[0].substring(0, 24).padEnd(24)} ║
║                                       ║
╚═══════════════════════════════════════╝`;

            if (sentMsg) {
                await sock.sendMessage(from, {
                    text: progressText,
                    edit: sentMsg.key,
                    mentions: [sender]
                });
                await new Promise(resolve => setTimeout(resolve, 800));
            } else {
                sentMsg = await sock.sendMessage(from, {
                    text: progressText,
                    mentions: [sender]
                }, { quoted: message });
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }
        
        // Final success message
        const successText = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🎉🎉🎉  SUCCESS!  🎉🎉🎉            ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                     ┃
┃  ✅ ${taskName.substring(0, 28).padEnd(28)} ┃
┃  ✨ Completed with Excellence!       ┃
┃  💎 Quality: Perfect                 ┃
┃  ⚡ Speed: Lightning Fast            ┃
┃                                     ┃
┃  🌟 Powered by Amazing Bot           ┃
┃  👨‍💻 Created by Ilom                  ┃
┃                                     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`;

        setTimeout(() => {
            sock.sendMessage(from, {
                text: successText
            }, { quoted: message });
        }, 1000);
    }
};
```

### Pro Tips for Glowing Effects

**Canvas-based Glow:**
- Use multiple shadow layers with decreasing blur
- Apply gradient fills for color transitions
- Combine different shadow colors for vibrant effects
- Use `globalAlpha` to create depth

**Text-based Glow:**
- Use Unicode box drawing characters (╔═╗║╚╝)
- Combine emojis for sparkle effects (✨💫⭐🌟)
- Use spacing and padding for alignment
- Create frames for animation effects

**Color Combinations:**
- Neon Pink + Cyan: `#ff00ff` + `#00ffff`
- Electric Blue + Yellow: `#0080ff` + `#ffff00`
- Purple + Gold: `#9b59b6` + `#f39c12`
- Green + White: `#00ff00` + `#ffffff`

**Performance Tips:**
- Cache generated images when possible
- Limit animation frames for smoother experience
- Use cooldowns to prevent spam
- Optimize canvas size based on content

---

## 🔑 Key Updates

1. **Canvas Graphics** - Create beautiful visual notifications
2. **Owner Recognition** - Automatic owner detection from .env
3. **Enhanced Permission System** - Multi-level access control
4. **Reply Handlers** - Interactive command follow-ups
5. **Chat Context** - Maintain conversation state
6. **Button Support** - Interactive button menus
7. **Database Integration** - User and group data management
8. **External APIs** - Fetch data from external services
9. **Glowing Styling** - Create stunning neon and glowing text effects

---

## 💬 Support

Need help creating commands?

1. Check existing commands in `src/commands/` for examples
2. Review the [main documentation](./README.md)
3. Join our support group
4. Open an issue on GitHub

---

<div align="center">

**Created with ❤️ by Ilom**

**Amazing Bot v1.0.0**

[Back to Main README](./README.md)

</div>
