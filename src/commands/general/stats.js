import config from '../../config.js';
import { commandHandler } from '../../handlers/commandHandler.js';
import { createCanvas } from 'canvas';
import moment from 'moment';
import os from 'os';

export default {
    name: 'stats',
    aliases: ['stat', 'botstat', 'statistics'],
    category: 'general',
    description: 'Display bot usage statistics with canvas graphics',
    usage: 'stats',
    example: 'stats',
    cooldown: 5,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: false,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            
            const memoryUsage = process.memoryUsage();
            const usedMemory = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
            const totalMemory = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
            
            const commandCount = commandHandler.getCommandCount();
            const topCommands = commandHandler.getTopCommands(5) || [];
            const categories = commandHandler.getAllCategories();
            
            const now = moment();
            const currentDate = now.format('DD/MM/YYYY');
            const currentTime = now.format('hh:mm:ss A');
            const currentDay = now.format('dddd');
            
            const canvas = createCanvas(1200, 900);
            const ctx = canvas.getContext('2d');

            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(0.5, '#764ba2');
            gradient.addColorStop(1, '#f093fb');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < 50; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = Math.random() * 3 + 1;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.font = 'bold 70px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 10;
            ctx.fillText('📊 BOT STATISTICS', canvas.width / 2, 100);

            ctx.shadowBlur = 0;

            const boxY = 150;
            const boxWidth = 1000;
            const boxHeight = 680;
            const boxX = (canvas.width - boxWidth) / 2;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 20);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.roundRect(ctx, boxX + 20, boxY + 20, boxWidth - 40, 140, 15);
            ctx.fill();

            ctx.font = 'bold 38px Arial';
            ctx.fillStyle = '#ffd700';
            ctx.textAlign = 'left';
            ctx.fillText('⚡ System Stats', boxX + 40, boxY + 65);

            ctx.font = '28px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Uptime: ' + days + 'd ' + hours + 'h ' + minutes + 'm ' + seconds + 's', boxX + 40, boxY + 110);
            ctx.fillText('Memory: ' + usedMemory + 'MB / ' + totalMemory + 'MB', boxX + 40, boxY + 145);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.roundRect(ctx, boxX + 20, boxY + 180, boxWidth - 40, 140, 15);
            ctx.fill();

            ctx.font = 'bold 38px Arial';
            ctx.fillStyle = '#00ff88';
            ctx.fillText('🎯 Command Stats', boxX + 40, boxY + 225);

            ctx.font = '28px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Total Commands: ' + commandCount, boxX + 40, boxY + 270);
            ctx.fillText('Categories: ' + categories.length, boxX + 40, boxY + 305);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.roundRect(ctx, boxX + 20, boxY + 340, boxWidth - 40, 200, 15);
            ctx.fill();

            ctx.font = 'bold 38px Arial';
            ctx.fillStyle = '#ff6b9d';
            ctx.fillText('🔥 Top Commands', boxX + 40, boxY + 385);

            ctx.font = '24px Arial';
            ctx.fillStyle = '#ffffff';
            if (topCommands.length > 0) {
                topCommands.forEach((cmd, i) => {
                    ctx.fillText((i + 1) + '. ' + cmd.name + ' (' + (cmd.used || 0) + ' uses)', boxX + 40, boxY + 425 + (i * 30));
                });
            } else {
                ctx.fillText('No command usage data yet', boxX + 40, boxY + 425);
            }

            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.roundRect(ctx, boxX + 20, boxY + 560, boxWidth - 40, 100, 15);
            ctx.fill();

            ctx.font = 'bold 38px Arial';
            ctx.fillStyle = '#a78bfa';
            ctx.fillText('📡 Server Info', boxX + 40, boxY + 605);

            ctx.font = '28px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Platform: ' + os.platform() + ' | Node: ' + process.version, boxX + 40, boxY + 645);

            ctx.font = '24px Arial';
            ctx.fillStyle = '#e0e0e0';
            ctx.textAlign = 'center';
            ctx.fillText(currentDay + ' | ' + currentDate + ' | ' + currentTime, canvas.width / 2, canvas.height - 50);

            const buffer = canvas.toBuffer('image/png');

            await sock.sendMessage(from, {
                image: buffer
            }, { quoted: message });

        } catch (error) {
            console.error('Stats command error:', error);
            
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            
            const memoryUsage = process.memoryUsage();
            const usedMemory = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
            const totalMemory = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
            
            const commandCount = commandHandler.getCommandCount();
            const topCommands = commandHandler.getTopCommands(5) || [];
            const categories = commandHandler.getAllCategories();
            
            const now = moment();
            const currentDate = now.format('DD/MM/YYYY');
            const currentTime = now.format('hh:mm:ss A');
            const currentDay = now.format('dddd');

            let statsText = '╭──⦿【 📊 BOT STATISTICS 】\n';
            statsText += '│ 🕐 𝗧𝗶𝗺𝗲: ' + currentTime + '\n';
            statsText += '│ 📅 𝗗𝗮𝘁𝗲: ' + currentDate + '\n';
            statsText += '│ 📆 𝗗𝗮𝘆: ' + currentDay + '\n';
            statsText += '╰────────⦿\n\n';
            statsText += '╭──⦿【 ⚡ SYSTEM STATS 】\n';
            statsText += '│ ⏰ 𝗨𝗽𝘁𝗶𝗺𝗲: ' + days + 'd ' + hours + 'h ' + minutes + 'm ' + seconds + 's\n';
            statsText += '│ 🧠 𝗠𝗲𝗺𝗼𝗿𝘆: ' + usedMemory + 'MB / ' + totalMemory + 'MB\n';
            statsText += '│ 🖥️ 𝗣𝗹𝗮𝘁𝗳𝗼𝗿𝗺: ' + os.platform() + '\n';
            statsText += '│ 📦 𝗡𝗼𝗱𝗲: ' + process.version + '\n';
            statsText += '│ 🌐 𝗠𝗼𝗱𝗲: ' + (isGroup ? 'Group' : 'Private') + '\n';
            statsText += '╰────────⦿\n\n';
            statsText += '╭──⦿【 🎯 COMMAND STATS 】\n';
            statsText += '│ 📂 𝗧𝗼𝘁𝗮𝗹: ' + commandCount + ' Commands\n';
            statsText += '│ 📁 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝗶𝗲𝘀: ' + categories.length + '\n';
            statsText += '│ 🔋 𝗦𝘁𝗮𝘁𝘂𝘀: Active ✅\n';
            statsText += '╰────────⦿\n\n';
            statsText += '╭──⦿【 🔥 TOP COMMANDS 】\n';
            if (topCommands.length > 0) {
                topCommands.forEach((cmd, i) => {
                    statsText += '│ ' + (i + 1) + '. ✧' + cmd.name + ' (' + (cmd.used || 0) + ' uses)\n';
                });
            } else {
                statsText += '│ No usage data yet\n';
            }
            statsText += '╰────────⦿\n\n';
            statsText += '╭─────────────⦿\n│💫 | [ ' + config.botName + ' 🍀 ]\n╰────────────⦿';

            await sock.sendMessage(from, {
                text: statsText
            }, { quoted: message });
        }
    },

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
};