import config from '../../config.js';
import { commandHandler } from '../../handlers/commandHandler.js';
import { getUser } from '../../models/User.js';
import moment from 'moment';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import fetch from 'node-fetch';

export default {
    name: 'help',
    aliases: ['h', 'menu', 'commands'],
    category: 'utility',
    description: 'Display bot commands with stunning canvas graphics',
    usage: 'help [command]',
    cooldown: 3,
    permissions: ['user'],
    supportsButtons: true,
    supportsReply: true,

    async execute({ sock, message, args, from, prefix, sender }) {
        const user = await getUser(sender);
        
        if (args.length > 0) {
            return this.showCommandDetails({ sock, message, from, commandName: args[0], prefix, user });
        }
        
        const categories = commandHandler.getAllCategories();
        const totalCommands = commandHandler.getCommandCount();
        
        const now = moment();
        const userStatus = user.isPremium ? '⚡ PREMIUM' : '🌟 FREE';
        const userName = user.name || 'User';
        
        try {
            const imageBuffer = await this.createHelpCanvas(userName, userStatus, totalCommands, categories);
            
            const categoryMap = {
                'admin': '🛡️', 'ai': '🤖', 'downloader': '📥', 'economy': '💰',
                'fun': '🎭', 'games': '🎮', 'general': '📱', 'media': '🎨',
                'owner': '👑', 'utility': '🔧'
            };

            let helpText = `╭──⦿【 ⚡ ${config.botName.toUpperCase()} HELP 】\n`;
            helpText += `│ 👤 User: ${userName}\n`;
            helpText += `│ 👑 Status: ${userStatus}\n`;
            helpText += `│ 🌐 Prefix: ${prefix}\n`;
            helpText += `│ 📊 Commands: ${totalCommands}\n`;
            helpText += `╰────────⦿\n\n`;

            for (const category of categories.sort()) {
                const commands = commandHandler.getCommandsByCategory(category);
                if (commands.length === 0) continue;
                
                const emoji = categoryMap[category] || '⭐';
                helpText += `${emoji} *${category.toUpperCase()}*\n`;
                helpText += commands.map(cmd => `  ✧ ${cmd.name}`).join('\n') + '\n\n';
            }

            helpText += `💡 Type ${prefix}help <command> for details\n`;
            helpText += `🆘 Type ${prefix}support to join our group`;

            await sock.sendMessage(from, {
                image: imageBuffer,
                caption: helpText,
                contextInfo: {
                    externalAdReply: {
                        title: `${config.botName} - Command Center`,
                        body: `${totalCommands} Commands Available`,
                        thumbnailUrl: config.botThumbnail,
                        sourceUrl: config.botRepository,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
        } catch (error) {
            console.error('Canvas error:', error);
            await this.sendTextHelp(sock, message, from, categories, totalCommands, userName, userStatus, prefix);
        }
    },

    async createHelpCanvas(userName, userStatus, totalCommands, categories) {
        const canvas = createCanvas(1200, 700);
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(0.5, '#764ba2');
        gradient.addColorStop(1, '#f093fb');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 80px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText('⚡ COMMAND CENTER ⚡', 600, 120);

        ctx.font = 'bold 45px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`Welcome, ${userName}!`, 600, 200);

        ctx.font = '35px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Status: ${userStatus}`, 600, 260);

        ctx.font = '40px Arial';
        ctx.fillStyle = '#00ff88';
        ctx.fillText(`${totalCommands} Commands Available`, 600, 340);

        ctx.font = '30px Arial';
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText(`${categories.length} Categories | Always Online`, 600, 400);

        const boxY = 450;
        const boxWidth = 1000;
        const boxHeight = 180;
        const boxX = (canvas.width - boxWidth) / 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 20);
        ctx.fill();

        ctx.font = '28px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('🎯 Quick Start Guide', 600, 500);

        ctx.font = '24px Arial';
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText('Use prefix followed by command name', 600, 545);
        ctx.fillText('Reply to any command for instant help', 600, 585);

        ctx.font = '22px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`Powered by ${config.botName} v${config.botVersion}`, 600, 660);

        return canvas.toBuffer('image/png');
    },

    async sendTextHelp(sock, message, from, categories, totalCommands, userName, userStatus, prefix) {
        const categoryMap = {
            'admin': '🛡️', 'ai': '🤖', 'downloader': '📥', 'economy': '💰',
            'fun': '🎭', 'games': '🎮', 'general': '📱', 'media': '🎨',
            'owner': '👑', 'utility': '🔧'
        };

        let helpText = `╭──⦿【 ⚡ ${config.botName.toUpperCase()} 】\n`;
        helpText += `│ 🎯 User: ${userName}\n`;
        helpText += `│ 👑 Status: ${userStatus}\n`;
        helpText += `│ 🌐 Prefix: ${prefix}\n`;
        helpText += `│ 📊 Commands: ${totalCommands}\n`;
        helpText += `╰────────⦿\n\n`;

        for (const category of categories.sort()) {
            const commands = commandHandler.getCommandsByCategory(category);
            if (commands.length === 0) continue;
            
            const emoji = categoryMap[category] || '⭐';
            helpText += `╭──⦿【 ${emoji} ${category.toUpperCase()} 】\n`;
            helpText += commands.map(cmd => `│ ✧ ${cmd.name}`).join('\n') + '\n';
            helpText += `╰────────⦿\n\n`;
        }

        helpText += `💡 Type ${prefix}help <command> for details`;

        await sock.sendMessage(from, { text: helpText }, { quoted: message });
    },

    async showCommandDetails({ sock, message, from, commandName, prefix, user }) {
        const command = commandHandler.getCommand(commandName);
        
        if (!command) {
            return sock.sendMessage(from, {
                text: `❌ Command "${commandName}" not found.\n\n💡 Use ${prefix}help to see all commands.`
            }, { quoted: message });
        }

        const helpText = `╭──⦿【 ${command.name.toUpperCase()} 】\n│\n│ 📝 Description:\n│ ${command.description || 'No description'}\n│\n│ 🏷️ Category: ${command.category.toUpperCase()}\n│\n│ 📖 Usage:\n│ ${prefix}${command.usage || command.name}\n│\n│ ⏱️ Cooldown: ${command.cooldown || 0}s\n│\n│ 👥 Permissions: ${(command.permissions || ['user']).join(', ')}\n${command.aliases && command.aliases.length > 0 ? `│\n│ 🔗 Aliases:\n│ ${command.aliases.map(a => prefix + a).join(', ')}` : ''}\n│\n╰────────────⦿\n\n💡 Reply to this message for help!`;
        
        const sentMsg = await sock.sendMessage(from, { text: helpText }, { quoted: message });
        
        if (command.supportsReply && sentMsg) {
            this.setupReplyHandler(sock, from, sentMsg.key.id, command, prefix);
        }
    },

    setupReplyHandler(sock, from, messageId, command, prefix) {
        const replyTimeout = setTimeout(() => {
            if (global.replyHandlers) {
                delete global.replyHandlers[messageId];
            }
        }, 300000);
        
        if (!global.replyHandlers) {
            global.replyHandlers = {};
        }
        
        global.replyHandlers[messageId] = {
            command: command.name,
            timeout: replyTimeout,
            handler: async (replyText, replyMessage) => {
                const response = `╭──⦿【 💬 HELP RESPONSE 】\n│\n│ Command: ${command.name}\n│ Question: ${replyText}\n│\n│ 📖 Answer:\n│ For ${prefix}${command.name}, use:\n│ ${prefix}${command.usage || command.name}\n│\n│ Need more help?\n│ Contact owner: ${prefix}owner\n│\n╰────────────⦿`;
                
                await sock.sendMessage(from, { text: response }, { quoted: replyMessage });
                
                clearTimeout(replyTimeout);
                delete global.replyHandlers[messageId];
            }
        };
    }
};
