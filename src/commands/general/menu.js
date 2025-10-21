import config from '../../config.js';
import { commandHandler } from '../../handlers/commandHandler.js';
import { getUser } from '../../models/User.js';
import moment from 'moment';
import fetch from 'node-fetch';

export default {
    name: 'menu',
    aliases: ['commands', 'list'],
    category: 'general',
    description: 'Enhanced interactive command menu with Dragon Ball theme',
    usage: 'menu [category]',
    cooldown: 3,
    permissions: ['user'],
    supportsButtons: true,

    async execute({ sock, message, args, from, prefix, sender }) {
        const category = args[0]?.toLowerCase();
        
        if (category) {
            return this.showCategoryCommands(sock, message, from, category, prefix);
        }

        const user = await getUser(sender) || {
            name: 'Warrior',
            isPremium: false,
            xp: 0,
            economy: { balance: 0 }
        };
        
        const categories = commandHandler.getAllCategories();
        const totalCommands = commandHandler.getCommandCount();
        
        const now = moment();
        const day = now.format('dddd');
        const date = now.format('DD/MM/YYYY');
        const time = now.format('hh:mm:ss A');
        
        const userStatus = user.isPremium ? '⚡ PREMIUM WARRIOR' : '🌟 FREE SAIYAN';
        const userPower = user.isPremium ? '♾️ ULTRA INSTINCT' : '⚔️ BASE FORM';
        const userCredits = user.isPremium ? '∞ ZENI' : `${user.economy?.balance ?? 0} ZENI`;
        const userName = user.name || 'Warrior';
        const userId = sender.split('@')[0];
        const userLevel = Math.floor((user.xp ?? 0) / 1000) + 1;

        const categoryMap = {
            'admin': { emoji: '🛡️', title: 'ADMIN', count: 0 },
            'ai': { emoji: '🤖', title: 'AI', count: 0 },
            'downloader': { emoji: '📥', title: 'DOWNLOADER', count: 0 },
            'economy': { emoji: '💰', title: 'ECONOMY', count: 0 },
            'fun': { emoji: '🎭', title: 'FUN', count: 0 },
            'games': { emoji: '🎮', title: 'GAMES', count: 0 },
            'general': { emoji: '📱', title: 'GENERAL', count: 0 },
            'media': { emoji: '🎨', title: 'MEDIA', count: 0 },
            'owner': { emoji: '👑', title: 'OWNER', count: 0 },
            'utility': { emoji: '🔧', title: 'UTILITY', count: 0 }
        };

        for (const cat of categories) {
            const commands = commandHandler.getCommandsByCategory(cat);
            if (categoryMap[cat]) {
                categoryMap[cat].count = commands.length;
            }
        }

        let menuText = `╔═══════════════════════════════════╗
║  ⚡ ${config.botName.toUpperCase()} - POWER MENU ⚡  
╚═══════════════════════════════════╝

╭━━━━━⦿「 👤 SAIYAN WARRIOR PROFILE 」⦿━━━━━╮
│
│  👤 𝗡𝗮𝗺𝗲: ${userName}
│  🆔 𝗜𝗗: @${userId}
│  📊 𝗟𝗲𝘃𝗲𝗹: ${userLevel}
│  ⚡ 𝗦𝘁𝗮𝘁𝘂𝘀: ${userStatus}
│  💪 𝗣𝗼𝘄𝗲𝗿: ${userPower}
│  💎 𝗭𝗲𝗻𝗶: ${userCredits}
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━⦿「 🤖 BOT SUPREME STATUS 」⦿━━━━━╮
│
│  🌐 𝗣𝗿𝗲𝗳𝗶𝘅: [ ${prefix} ]
│  🤖 𝗕𝗼𝘁 𝗡𝗮𝗺𝗲: ${config.botName}
│  📦 𝗩𝗲𝗿𝘀𝗶𝗼𝗻: v${config.botVersion}
│  👨‍💻 𝗖𝗿𝗲𝗮𝘁𝗼𝗿: ${config.ownerName}
│  🔄 𝗦𝗲𝗿𝘃𝗲𝗿: ONLINE 🟢
│  🌍 𝗠𝗼𝗱𝗲: ${config.publicMode ? 'PUBLIC 🌐' : 'PRIVATE 🔐'}
│  📅 𝗗𝗮𝘁𝗲: ${date}
│  📆 𝗗𝗮𝘆: ${day}
│  ⏰ 𝗧𝗶𝗺𝗲: ${time}
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

`;

        for (const category of categories.sort()) {
            const commands = commandHandler.getCommandsByCategory(category);
            if (commands.length === 0) continue;
            
            const categoryInfo = categoryMap[category] || { emoji: '⭐', title: category.toUpperCase(), count: commands.length };
            
            menuText += `╭─⦿「 ${categoryInfo.emoji} ${categoryInfo.title} 」
│ ╭───────────────────╮\n`;
            
            const commandList = commands.map(cmd => `✧${cmd.name}`).join(' ');
            const words = commandList.split(' ');
            let currentLine = '│ │';
            
            for (const word of words) {
                if ((currentLine + ' ' + word).length > 60) {
                    menuText += currentLine + '\n';
                    currentLine = '│ │' + word;
                } else {
                    currentLine += (currentLine === '│ │' ? '' : ' ') + word;
                }
            }
            
            if (currentLine !== '│ │') {
                menuText += currentLine + '\n';
            }
            
            menuText += `│ ╰───────────────────╯
│ 📊 Total: ${categoryInfo.count} commands
╰────────⦿

`;
        }

        menuText += `╭━━━━━⦿「 📊 POWER STATISTICS 」⦿━━━━━╮
│
│  🎯 𝗧𝗼𝘁𝗮𝗹 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀: ${totalCommands}
│  📂 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝗶𝗲𝘀: ${categories.length}
│  🌟 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗦𝘁𝗮𝘁𝘂𝘀: ${user.isPremium ? 'ACTIVE ✅' : 'INACTIVE ❌'}
│  🏆 𝗣𝗼𝘄𝗲𝗿 𝗟𝗲𝘃𝗲𝗹: ${userLevel * 1000} 🔥
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━⦿「 💡 USAGE GUIDE 」⦿━━━━━╮
│
│  📌 View Category:
│  ▸ ${prefix}menu <category>
│  ▸ Example: ${prefix}menu games
│  
│  📌 Command Help:
│  ▸ ${prefix}help <command>
│  ▸ Example: ${prefix}help ping
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━⦿「 ⚡ QUICK ACCESS 」⦿━━━━━╮
│
│  ⚡ ${prefix}ping - Test Response Speed
│  🎨 ${prefix}sticker - Create Sticker
│  🤖 ${prefix}chatgpt - AI Assistant
│  📊 ${prefix}rank - View Your Stats
│  💰 ${prefix}balance - Check Wallet
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╔═══════════════════════════════════╗
║  🐉 ${config.botName} - Power Level ∞ 🐉  
╚═══════════════════════════════════╝

✨ Join our community: ${prefix}support
🌟 Stay powerful, Saiyan Warrior!`;

        const supportGroup = config.supportGroup || process.env.SUPPORT_GROUP || 'https://github.com/NexusCoders-cyber/Amazing-Bot-';
        const repoUrl = config.botRepository || 'https://github.com/NexusCoders-cyber/Amazing-Bot-';
        
        menuText += `\n\n╭━━━━━⦿「 🔗 LINKS 」⦿━━━━━╮
│
│  📦 Repository:
│  ${repoUrl}
│
│  💬 Support Group:
│  ${supportGroup}
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        try {
            await sock.sendMessage(from, {
                text: menuText,
                mentions: [sender]
            }, { quoted: message });
        } catch (error) {
            console.error('Menu send error:', error);
            await sock.sendMessage(from, {
                text: menuText
            }, { quoted: message });
        }
    },
    
    async showCategoryCommands(sock, message, from, category, prefix) {
        const categories = {
            games: {
                title: '🎮 GAMES COMMANDS',
                description: 'Interactive games and challenges',
                emoji: '🎮',
                commands: []
            },
            ai: {
                title: '🤖 AI & SMART COMMANDS', 
                description: 'AI-powered intelligent features',
                emoji: '🤖',
                commands: []
            },
            general: {
                title: '📱 GENERAL COMMANDS',
                description: 'Information and utility functions',
                emoji: '📱',
                commands: []
            },
            media: {
                title: '🎨 MEDIA COMMANDS',
                description: 'Image and video processing',
                emoji: '🎨',
                commands: []
            },
            utility: {
                title: '🔧 UTILITY COMMANDS',
                description: 'Developer and power user tools',
                emoji: '🔧',
                commands: []
            },
            admin: {
                title: '🛡️ ADMIN COMMANDS',
                description: 'Group management and moderation',
                emoji: '🛡️',
                commands: []
            },
            owner: {
                title: '👑 OWNER COMMANDS',
                description: 'Bot owner exclusive commands',
                emoji: '👑',
                commands: []
            },
            economy: {
                title: '💰 ECONOMY COMMANDS',
                description: 'Virtual economy and gambling',
                emoji: '💰',
                commands: []
            },
            downloader: {
                title: '📥 DOWNLOADER COMMANDS',
                description: 'Media downloaders from social platforms',
                emoji: '📥',
                commands: []
            },
            fun: {
                title: '🎭 FUN COMMANDS',
                description: 'Entertainment and fun features',
                emoji: '🎭',
                commands: []
            }
        };
        
        const cat = categories[category];
        if (!cat) {
            return sock.sendMessage(from, {
                text: `❌ *Unknown category "${category}"*\n\nValid categories:\n${Object.keys(categories).map(c => `• ${c}`).join('\n')}`
            }, { quoted: message });
        }

        const commands = commandHandler.getCommandsByCategory(category);
        
        let commandList = `╔════════════════════╗
║ ${cat.emoji} ${cat.title}
╚════════════════════╝

📝 ${cat.description}

╭─⦿「 📜 COMMAND LIST 」
│ ╭───────────────────╮
`;
        
        commands.forEach((cmd, index) => {
            commandList += `│ │ ${index + 1}. ✧${prefix}${cmd.name}\n│ │    └ ${cmd.description || 'No description'}\n`;
        });
        
        commandList += `│ ╰───────────────────╯
╰────────⦿

╭─⦿「 💡 TIP 」
│ Use ${prefix}help <command>
│ for detailed information
╰────────⦿

📊 Total: ${commands.length} commands in ${cat.title}`;

        try {
            await sock.sendMessage(from, {
                text: commandList
            }, { quoted: message });
        } catch (error) {
            console.error('Category menu error:', error);
            await sock.sendMessage(from, {
                text: commandList
            }, { quoted: message });
        }
    }
};
