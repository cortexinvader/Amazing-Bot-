# Command Template Guide

This guide provides standardized templates for creating commands in the Amazing Bot. Follow these patterns to ensure consistency and proper functionality.

---

## 📋 Table of Contents

1. [Basic Command Structure](#basic-command-structure)
2. [Command Categories](#command-categories)
3. [Permission Levels](#permission-levels)
4. [Template Examples](#template-examples)
   - [General Command](#general-command-template)
   - [Admin Command](#admin-command-template)
   - [Owner Command](#owner-command-template)
   - [Economy Command](#economy-command-template)
   - [Game Command](#game-command-template)

---

## Basic Command Structure

Every command file must export a default object with the following structure:

```javascript
export default {
    name: 'commandname',
    aliases: ['alias1', 'alias2'],
    category: 'category',
    description: 'Brief description of what the command does',
    usage: 'commandname [arg1] [arg2]',
    example: 'commandname value1 value2',
    cooldown: 3,
    permissions: ['permission_level'],
    ownerOnly: false,
    adminOnly: false,
    groupOnly: false,
    privateOnly: false,
    botAdminRequired: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    
    async execute({ sock, message, args, from, sender, isGroup, isGroupAdmin, isBotAdmin, isOwner, user, group, command, prefix }) {
        
    }
};
```

---

## Command Categories

Available categories for organizing commands:

- **admin** - Group administration and moderation
- **ai** - Artificial intelligence and chatbot features
- **downloader** - Media downloading from various platforms
- **economy** - Virtual economy, currency, and shop
- **fun** - Entertainment and miscellaneous fun commands
- **games** - Interactive games and puzzles
- **general** - General utility and information commands
- **media** - Media processing and manipulation
- **owner** - Bot owner exclusive commands
- **utility** - Useful tools and utilities

---

## Permission Levels

### Available Permissions

- **owner** - Bot owner only (defined in config.ownerNumbers)
- **admin** - Group admins or bot owner
- **premium** - Premium users or bot owner
- **user** - Regular users (when publicMode is enabled)
- **group** - Must be in a group
- **private** - Must be in private chat
- **botAdmin** - Bot must have admin privileges

### Sudo System

Users added via `sudo add` command can execute owner category commands. The permission check includes:
- `isOwner` - Owner numbers from config
- `isSudo` - Users in sudoers list

---

## Template Examples

### General Command Template

For basic commands without special permissions:

```javascript
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'example',
    aliases: ['ex', 'sample'],
    category: 'general',
    description: 'Example command description',
    usage: 'example <text>',
    example: 'example hello world',
    cooldown: 3,
    permissions: ['user'],
    minArgs: 1,

    async execute({ sock, message, args, from, sender, user }) {
        try {
            const text = args.join(' ');
            
            const response = `╭──⦿【 ✨ EXAMPLE RESULT 】
│
│ 📝 𝗜𝗻𝗽𝘂𝘁: ${text}
│ 👤 𝗨𝘀𝗲𝗿: @${sender.split('@')[0]}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
╰────────────⦿`;

            await sock.sendMessage(from, {
                text: response,
                mentions: [sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('EXECUTION FAILED',
                    'An error occurred while executing the command',
                    error.message)
            }, { quoted: message });
        }
    }
};
```

---

### Admin Command Template

For group administration commands:

```javascript
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'admincommand',
    aliases: ['admincmd'],
    category: 'admin',
    description: 'Description of admin command',
    usage: 'admincommand @user OR reply to message',
    example: 'admincommand @user',
    cooldown: 3,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, args, from, sender, isGroup, isGroupAdmin, isBotAdmin }) {
        if (!isGroup) {
            return sock.sendMessage(from, {
                text: formatResponse.error('GROUP ONLY',
                    'This command can only be used in groups')
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return sock.sendMessage(from, {
                text: formatResponse.error('ADMIN ONLY',
                    'You need to be a group admin to use this command')
            }, { quoted: message });
        }

        if (!isBotAdmin) {
            return sock.sendMessage(from, {
                text: formatResponse.error('BOT NOT ADMIN',
                    'I need admin privileges to execute this command',
                    'Make me an admin first')
            }, { quoted: message });
        }

        try {
            const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            let targetJid;
            if (quotedUser) {
                targetJid = quotedUser;
            } else if (mentionedUsers.length > 0) {
                targetJid = mentionedUsers[0];
            } else {
                return sock.sendMessage(from, {
                    text: formatResponse.error('NO TARGET',
                        'Reply to a message or mention a user',
                        'Usage: admincommand @user OR reply to message')
                }, { quoted: message });
            }

            const targetNumber = targetJid.split('@')[0];
            
            await sock.sendMessage(from, {
                text: `╭──⦿【 ✅ ACTION COMPLETED 】
│
│ 👤 𝗧𝗮𝗿𝗴𝗲𝘁: @${targetNumber}
│ 👮 𝗕𝘆: @${sender.split('@')[0]}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
╰────────────⦿`,
                mentions: [targetJid, sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('ACTION FAILED',
                    'Failed to execute admin action',
                    error.message)
            }, { quoted: message });
        }
    }
};
```

---

### Owner Command Template

For bot owner exclusive commands (also accessible by sudo users):

```javascript
import config from '../../config.js';
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'ownercommand',
    aliases: ['ownercmd'],
    category: 'owner',
    description: 'Description of owner command',
    usage: 'ownercommand <action> [args]',
    example: 'ownercommand action value',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,

    async execute({ sock, message, args, from, sender, isOwner }) {
        try {
            const action = args[0]?.toLowerCase();
            
            if (!action) {
                return sock.sendMessage(from, {
                    text: `❌ *Invalid Action*

Available actions:
• action1 - Description of action1
• action2 - Description of action2
• action3 - Description of action3

*Usage:*
• ${config.prefix}ownercommand action1
• ${config.prefix}ownercommand action2 value`
                }, { quoted: message });
            }

            const response = `✅ *Action Completed*

*Action:* ${action}
*Executed by:* @${sender.split('@')[0]}
*Date:* ${new Date().toLocaleString()}

Your owner command has been executed successfully.`;

            await sock.sendMessage(from, {
                text: response,
                mentions: [sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ *Error*

Failed to execute owner command.

*Error:* ${error.message}

Please try again.`
            }, { quoted: message });
        }
    }
};
```

---

### Economy Command Template

For economy system commands with database interaction:

```javascript
import { getUser, updateUser } from '../../models/User.js';
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'economycommand',
    aliases: ['ecocmd'],
    category: 'economy',
    description: 'Description of economy command',
    usage: 'economycommand [amount]',
    example: 'economycommand 100',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, sender, user }) {
        try {
            const amount = parseInt(args[0]) || 0;
            
            if (amount < 1) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('INVALID AMOUNT',
                        'Please specify a valid amount greater than 0',
                        'Usage: economycommand <amount>')
                }, { quoted: message });
            }

            if (user.economy.balance < amount) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('INSUFFICIENT FUNDS',
                        `You need $${amount} but only have $${user.economy.balance}`,
                        'Earn more money with daily, work, or gamble commands')
                }, { quoted: message });
            }

            await updateUser(sender, {
                $inc: { 'economy.balance': -amount }
            });

            const response = `╭──⦿【 💰 TRANSACTION 】
│
│ 👤 𝗨𝘀𝗲𝗿: @${sender.split('@')[0]}
│ 💵 𝗔𝗺𝗼𝘂𝗻𝘁: $${amount}
│ 💳 𝗡𝗲𝘄 𝗕𝗮𝗹𝗮𝗻𝗰𝗲: $${user.economy.balance - amount}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
╰────────────⦿`;

            await sock.sendMessage(from, {
                text: response,
                mentions: [sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('TRANSACTION FAILED',
                    'An error occurred during the transaction',
                    error.message)
            }, { quoted: message });
        }
    }
};
```

---

### Game Command Template

For interactive game commands:

```javascript
import { getUser, updateUser } from '../../models/User.js';
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'gamecommand',
    aliases: ['game'],
    category: 'games',
    description: 'Description of game command',
    usage: 'gamecommand [difficulty]',
    example: 'gamecommand easy',
    cooldown: 10,
    permissions: ['user'],

    async execute({ sock, message, args, from, sender, user }) {
        try {
            const difficulty = args[0]?.toLowerCase() || 'normal';
            const validDifficulties = ['easy', 'normal', 'hard'];
            
            if (!validDifficulties.includes(difficulty)) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('INVALID DIFFICULTY',
                        'Choose a valid difficulty level',
                        'Available: easy, normal, hard')
                }, { quoted: message });
            }

            const gamePrompt = `╭──⦿【 🎮 GAME STARTED 】
│
│ 🎯 𝗚𝗮𝗺𝗲: Game Name
│ 👤 𝗣𝗹𝗮𝘆𝗲𝗿: @${sender.split('@')[0]}
│ ⚡ 𝗗𝗶𝗳𝗳𝗶𝗰𝘂𝗹𝘁𝘆: ${difficulty.toUpperCase()}
│ 🏆 𝗥𝗲𝘄𝗮𝗿𝗱: 100 XP + $50
│
│ Reply to this message with your answer!
│
╰────────────⦿`;

            await sock.sendMessage(from, {
                text: gamePrompt,
                mentions: [sender]
            }, { quoted: message });

            await updateUser(sender, {
                $inc: { 'gameStats.gamesPlayed': 1 }
            });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('GAME ERROR',
                    'Failed to start the game',
                    error.message)
            }, { quoted: message });
        }
    }
};
```

---

## 🎯 Best Practices

### 1. Error Handling
Always wrap command logic in try-catch blocks and provide meaningful error messages to users.

### 2. User Mentions
When mentioning users, use the format:
```javascript
mentions: [sender, targetJid]
```

### 3. Quoted Messages
Always quote the original message for context:
```javascript
{ quoted: message }
```

### 4. Consistent Formatting
Use the standardized box format for responses:
```
╭──⦿【 TITLE 】
│
│ Field: Value
│
╰────────────⦿
```

### 5. Date Formatting
Use consistent date formatting:
```javascript
new Date().toLocaleDateString()
new Date().toLocaleString()
```

### 6. Permission Checks
For admin commands, always verify:
- `isGroup` - Command is used in a group
- `isGroupAdmin` - User is a group admin
- `isBotAdmin` - Bot has admin privileges

### 7. Database Operations
Always use the model functions:
```javascript
import { getUser, updateUser } from '../../models/User.js';
import { getGroup, updateGroup } from '../../models/Group.js';
```

### 8. No Comments
Do not add comments to the command code. The code should be self-explanatory.

---

## 📦 Required Imports

### Common Imports
```javascript
import formatResponse from '../../utils/formatUtils.js';
```

### For Database Commands
```javascript
import { getUser, updateUser } from '../../models/User.js';
import { getGroup, updateGroup } from '../../models/Group.js';
```

### For Owner Commands
```javascript
import config from '../../config.js';
```

### For Canvas/Image Commands
```javascript
import { createWelcomeImage, createLevelUpImage } from '../../utils/canvasUtils.js';
```

---

## ✅ Command Properties Reference

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | ✅ | Command name (lowercase) |
| `aliases` | array | ❌ | Alternative names for the command |
| `category` | string | ✅ | Command category |
| `description` | string | ✅ | Brief description |
| `usage` | string | ✅ | How to use the command |
| `example` | string | ❌ | Example usage |
| `cooldown` | number | ❌ | Cooldown in seconds (default: 0) |
| `permissions` | array | ❌ | Required permissions |
| `ownerOnly` | boolean | ❌ | Owner only command |
| `adminOnly` | boolean | ❌ | Admin only command |
| `groupOnly` | boolean | ❌ | Group only command |
| `privateOnly` | boolean | ❌ | Private chat only |
| `botAdminRequired` | boolean | ❌ | Bot needs admin rights |
| `minArgs` | number | ❌ | Minimum arguments required |
| `maxArgs` | number | ❌ | Maximum arguments allowed |
| `typing` | boolean | ❌ | Show typing indicator |
| `execute` | function | ✅ | Main command function |

---

## 🔧 Execute Function Parameters

The execute function receives a destructured object with:

| Parameter | Type | Description |
|-----------|------|-------------|
| `sock` | object | WhatsApp socket connection |
| `message` | object | Original message object |
| `args` | array | Command arguments |
| `from` | string | Chat/Group JID |
| `sender` | string | Sender JID |
| `isGroup` | boolean | Is message from a group |
| `isGroupAdmin` | boolean | Is sender a group admin |
| `isBotAdmin` | boolean | Is bot a group admin |
| `isOwner` | boolean | Is sender the bot owner |
| `user` | object | User database object |
| `group` | object | Group database object (if applicable) |
| `command` | string | Command name used |
| `prefix` | string | Command prefix used |

---

## 🎨 Response Formatting

Use `formatResponse` utility for consistent error and info messages:

```javascript
import formatResponse from '../../utils/formatUtils.js';

formatResponse.error('ERROR TITLE', 'Error description', 'Additional info');

formatResponse.info('INFO TITLE', ['Info line 1', 'Info line 2']);

formatResponse.success('SUCCESS TITLE', 'Success message');
```

---

## 🚀 Testing Your Command

1. Place command file in appropriate category folder
2. Restart the bot to load the command
3. Test all scenarios: success, errors, edge cases
4. Verify permissions work correctly
5. Test cooldown functionality
6. Ensure database operations work
7. Check response formatting

---

## 📝 Example File Structure

```
src/commands/
├── admin/
│   └── kick.js
├── owner/
│   └── sudo.js
├── general/
│   └── profile.js
├── economy/
│   └── daily.js
└── games/
    └── trivia.js
```

---

*Template created for Amazing Bot v1.0.0*
*Follow these templates to maintain code quality and consistency*
