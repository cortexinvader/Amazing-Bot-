import config from '../../config.js';
import { commandHandler } from '../../handlers/commandHandler.js';
import { createCanvas } from '@napi-rs/canvas';
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

    async execute({ sock, message, from, sender, isGroup }) {
        try {
            await sock.sendMessage(from, {
                react: { text: '📊', key: message.key }
            });

            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            
            const memoryUsage = process.memoryUsage();
            const usedMemory = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
            const totalMemory = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
            const memoryPercent = ((usedMemory / totalMemory) * 100).toFixed(1);
            
            const commandCount = commandHandler.getCommandCount();
            const commandStats = commandHandler.getCommandStats();
            const categories = commandHandler.getAllCategories();
            
            const topCommands = [];
            if (commandStats && commandStats.commandUsage) {
                const sortedCommands = Object.entries(commandStats.commandUsage)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 5);
                
                sortedCommands.forEach(([name, data]) => {
                    topCommands.push({
                        name,
                        count: data.count,
                        avgTime: data.avgTime || 0
                    });
                });
            }
            
            const now = moment();
            const currentDate = now.format('DD MMM YYYY');
            const currentTime = now.format('hh:mm:ss A');
            const currentDay = now.format('dddd');
            
            const canvas = createCanvas(1400, 1100);
            const ctx = canvas.getContext('2d');

            const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            bgGradient.addColorStop(0, '#0f0c29');
            bgGradient.addColorStop(0.5, '#302b63');
            bgGradient.addColorStop(1, '#24243e');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < 150; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = Math.random() * 2.5;
                const opacity = Math.random() * 0.8;
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            for (let i = 0; i < 8; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const radius = Math.random() * 150 + 100;
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                gradient.addColorStop(0, 'rgba(138, 43, 226, 0.15)');
                gradient.addColorStop(1, 'rgba(138, 43, 226, 0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.shadowColor = 'rgba(138, 43, 226, 0.5)';
            ctx.shadowBlur = 30;
            ctx.font = 'bold 80px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('📊 BOT STATISTICS', canvas.width / 2, 110);
            ctx.shadowBlur = 0;

            ctx.font = '32px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(currentDay + ' • ' + currentDate + ' • ' + currentTime, canvas.width / 2, 160);

            const cardSpacing = 30;
            const cardWidth = 650;
            const cardHeight = 240;
            let currentY = 220;

            this.drawCard(ctx, 75, currentY, cardWidth, cardHeight, {
                title: '⚡ SYSTEM STATUS',
                icon: '🖥️',
                data: [
                    { label: 'Uptime', value: `${days}d ${hours}h ${minutes}m ${seconds}s`, color: '#00d4ff' },
                    { label: 'Memory', value: `${usedMemory} MB / ${totalMemory} MB`, color: '#7928ca' },
                    { label: 'Usage', value: `${memoryPercent}%`, color: '#ff0080' },
                    { label: 'Platform', value: os.platform().toUpperCase(), color: '#00ff87' }
                ]
            });

            this.drawCard(ctx, 75 + cardWidth + cardSpacing, currentY, cardWidth, cardHeight, {
                title: '🎯 COMMANDS',
                icon: '⚙️',
                data: [
                    { label: 'Total', value: commandCount.toString(), color: '#00d4ff' },
                    { label: 'Categories', value: categories.length.toString(), color: '#7928ca' },
                    { label: 'Executed', value: (commandStats.totalExecutions || 0).toString(), color: '#ff0080' },
                    { label: 'Success Rate', value: commandStats.totalExecutions > 0 ? 
                        `${((commandStats.successfulExecutions / commandStats.totalExecutions) * 100).toFixed(1)}%` : '0%', 
                        color: '#00ff87' }
                ]
            });

            currentY += cardHeight + cardSpacing;

            const topCommandsCard = {
                x: 75,
                y: currentY,
                width: canvas.width - 150,
                height: 380
            };

            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.strokeStyle = 'rgba(138, 43, 226, 0.4)';
            ctx.lineWidth = 2;
            this.roundRect(ctx, topCommandsCard.x, topCommandsCard.y, topCommandsCard.width, topCommandsCard.height, 25);
            ctx.fill();
            ctx.stroke();

            const iconGradient = ctx.createLinearGradient(
                topCommandsCard.x + 50, 
                topCommandsCard.y + 50, 
                topCommandsCard.x + 100, 
                topCommandsCard.y + 100
            );
            iconGradient.addColorStop(0, '#7928ca');
            iconGradient.addColorStop(1, '#ff0080');
            ctx.fillStyle = iconGradient;
            ctx.font = '60px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('🔥', topCommandsCard.x + 40, topCommandsCard.y + 75);

            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('TOP COMMANDS', topCommandsCard.x + 120, topCommandsCard.y + 70);

            if (topCommands.length > 0) {
                const barStartY = topCommandsCard.y + 130;
                const barHeight = 40;
                const barSpacing = 15;
                const maxCount = topCommands[0].count;

                topCommands.forEach((cmd, i) => {
                    const y = barStartY + (i * (barHeight + barSpacing));
                    const barMaxWidth = topCommandsCard.width - 500;
                    const barWidth = (cmd.count / maxCount) * barMaxWidth;

                    ctx.font = 'bold 28px Arial';
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'left';
                    ctx.fillText(`${i + 1}. ${cmd.name}`, topCommandsCard.x + 40, y + 28);

                    const barX = topCommandsCard.x + 350;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    this.roundRect(ctx, barX, y, barMaxWidth, barHeight, 20);
                    ctx.fill();

                    const barGradient = ctx.createLinearGradient(barX, y, barX + barWidth, y);
                    const colors = [
                        ['#667eea', '#764ba2'],
                        ['#f093fb', '#f5576c'],
                        ['#4facfe', '#00f2fe'],
                        ['#43e97b', '#38f9d7'],
                        ['#fa709a', '#fee140']
                    ];
                    barGradient.addColorStop(0, colors[i][0]);
                    barGradient.addColorStop(1, colors[i][1]);
                    ctx.fillStyle = barGradient;
                    this.roundRect(ctx, barX, y, barWidth, barHeight, 20);
                    ctx.fill();

                    ctx.font = 'bold 26px Arial';
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'right';
                    ctx.fillText(`${cmd.count} uses`, topCommandsCard.x + topCommandsCard.width - 40, y + 28);
                });
            } else {
                ctx.font = '32px Arial';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.textAlign = 'center';
                ctx.fillText('No command usage data yet', canvas.width / 2, topCommandsCard.y + 200);
            }

            currentY += topCommandsCard.height + cardSpacing;

            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.textAlign = 'center';
            ctx.fillText('Powered by ' + (config.botName || 'WhatsApp Bot'), canvas.width / 2, currentY + 30);

            const buffer = canvas.toBuffer('image/png');

            await sock.sendMessage(from, {
                image: buffer,
                caption: `📊 Bot Statistics\n\n` +
                         `⏱️ Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s\n` +
                         `💾 Memory: ${usedMemory}MB / ${totalMemory}MB (${memoryPercent}%)\n` +
                         `📦 Commands: ${commandCount} (${categories.length} categories)\n` +
                         `✅ Executions: ${commandStats.totalExecutions || 0}\n\n` +
                         `Generated: ${currentTime}`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

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
            const commandStats = commandHandler.getCommandStats();
            const categories = commandHandler.getAllCategories();
            
            const now = moment();
            const currentDate = now.format('DD/MM/YYYY');
            const currentTime = now.format('hh:mm:ss A');
            const currentDay = now.format('dddd');

            let statsText = '📊 BOT STATISTICS\n\n';
            statsText += '⏰ Time: ' + currentTime + '\n';
            statsText += '📅 Date: ' + currentDate + '\n';
            statsText += '📆 Day: ' + currentDay + '\n\n';
            statsText += '⚡ SYSTEM STATS\n';
            statsText += '⏱️ Uptime: ' + days + 'd ' + hours + 'h ' + minutes + 'm ' + seconds + 's\n';
            statsText += '💾 Memory: ' + usedMemory + 'MB / ' + totalMemory + 'MB\n';
            statsText += '🖥️ Platform: ' + os.platform() + '\n';
            statsText += '📦 Node: ' + process.version + '\n\n';
            statsText += '🎯 COMMAND STATS\n';
            statsText += '📂 Total: ' + commandCount + ' Commands\n';
            statsText += '📁 Categories: ' + categories.length + '\n';
            statsText += '✅ Executions: ' + (commandStats.totalExecutions || 0) + '\n';
            statsText += '🔋 Status: Active ✅\n\n';
            statsText += 'Powered by ' + (config.botName || 'WhatsApp Bot');

            await sock.sendMessage(from, {
                text: statsText
            }, { quoted: message });
        }
    },

    drawCard(ctx, x, y, width, height, config) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeStyle = 'rgba(138, 43, 226, 0.4)';
        ctx.lineWidth = 2;
        this.roundRect(ctx, x, y, width, height, 25);
        ctx.fill();
        ctx.stroke();

        const iconGradient = ctx.createLinearGradient(x + 40, y + 40, x + 90, y + 90);
        iconGradient.addColorStop(0, '#7928ca');
        iconGradient.addColorStop(1, '#ff0080');
        ctx.fillStyle = iconGradient;
        ctx.font = '50px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(config.icon, x + 35, y + 70);

        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(config.title, x + 110, y + 65);

        const dataStartY = y + 115;
        const dataSpacing = 28;

        config.data.forEach((item, i) => {
            const dataY = dataStartY + (i * dataSpacing);
            
            ctx.font = '24px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(item.label + ':', x + 40, dataY);

            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = item.color;
            ctx.textAlign = 'right';
            ctx.fillText(item.value, x + width - 40, dataY);
            ctx.textAlign = 'left';
        });
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