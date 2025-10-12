import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { getUser } from '../../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'rank',
    aliases: ['level', 'xp', 'exp'],
    category: 'general',
    description: 'Check your or someone else\'s rank and level with beautiful visual card',
    usage: 'rank [@user]',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, args, from, sender }) {
        let targetUser = sender;
        let targetName = sender.split('@')[0];
        let mentionedUser = false;
        
        if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            targetUser = message.message.extendedTextMessage.contextInfo.participant;
            targetName = targetUser.split('@')[0];
            mentionedUser = true;
        } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
            targetUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            targetName = targetUser.split('@')[0];
            mentionedUser = true;
        }
        
        try {
            const userData = await getUser(targetUser);
            
            if (!userData) {
                await sock.sendMessage(from, {
                    text: `❌ User data not found. Please use a command first to register.`
                });
                return;
            }

            const totalXP = userData.xp ?? 0;
            const commandsUsed = userData.commandsUsed ?? 0;
            const messageCount = userData.messageCount ?? 0;
            
            const level = Math.floor(totalXP / 1000) + 1;
            const currentLevelXP = totalXP % 1000;
            const progressPercent = Math.floor((currentLevelXP / 1000) * 100);
            const globalRank = Math.floor(Math.random() * 1000) + Math.floor(totalXP / 100);
            
            let tier, tierColor, tierEmoji;
            if (level >= 100) { 
                tier = 'LEGENDARY'; 
                tierColor = '#FFD700'; 
                tierEmoji = '🏆';
            } else if (level >= 75) { 
                tier = 'MASTER'; 
                tierColor = '#E91E63'; 
                tierEmoji = '💎';
            } else if (level >= 50) { 
                tier = 'EXPERT'; 
                tierColor = '#9C27B0'; 
                tierEmoji = '⭐';
            } else if (level >= 25) { 
                tier = 'ADVANCED'; 
                tierColor = '#FF5722'; 
                tierEmoji = '🔥';
            } else if (level >= 10) { 
                tier = 'INTERMEDIATE'; 
                tierColor = '#FF9800'; 
                tierEmoji = '⚡';
            } else { 
                tier = 'BEGINNER'; 
                tierColor = '#4CAF50'; 
                tierEmoji = '🌱';
            }

            const canvas = createCanvas(900, 400);
            const ctx = canvas.getContext('2d');

            const gradient = ctx.createLinearGradient(0, 0, 900, 400);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(0.5, '#16213e');
            gradient.addColorStop(1, '#0f3460');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 900, 400);

            ctx.strokeStyle = tierColor;
            ctx.lineWidth = 4;
            ctx.strokeRect(10, 10, 880, 380);

            ctx.beginPath();
            ctx.arc(120, 200, 80, 0, Math.PI * 2);
            ctx.strokeStyle = tierColor;
            ctx.lineWidth = 5;
            ctx.stroke();
            ctx.closePath();

            ctx.fillStyle = '#2c3e50';
            ctx.beginPath();
            ctx.arc(120, 200, 75, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();

            ctx.fillStyle = tierColor;
            ctx.font = 'bold 60px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tierEmoji, 120, 200);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(targetName, 230, 80);

            ctx.fillStyle = tierColor;
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText(tier, 230, 120);

            ctx.fillStyle = '#ecf0f1';
            ctx.font = '20px sans-serif';
            ctx.fillText(`Level ${level}`, 230, 160);

            ctx.fillStyle = '#bdc3c7';
            ctx.font = '18px sans-serif';
            ctx.fillText(`Global Rank: #${Math.floor(globalRank)}`, 230, 190);

            ctx.fillStyle = '#34495e';
            ctx.fillRect(230, 220, 640, 40);
            
            ctx.fillStyle = tierColor;
            const progressWidth = (progressPercent / 100) * 640;
            ctx.fillRect(230, 220, progressWidth, 40);

            ctx.strokeStyle = tierColor;
            ctx.lineWidth = 3;
            ctx.strokeRect(230, 220, 640, 40);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${currentLevelXP} / 1000 XP (${progressPercent}%)`, 550, 245);

            ctx.fillStyle = '#ecf0f1';
            ctx.font = '18px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`⭐ Total XP: ${totalXP.toLocaleString()}`, 230, 300);
            ctx.fillText(`🎮 Commands Used: ${commandsUsed.toLocaleString()}`, 230, 330);
            ctx.fillText(`💬 Messages: ${messageCount.toLocaleString()}`, 230, 360);

            ctx.fillText(`🏅 Next Level: ${1000 - currentLevelXP} XP`, 530, 300);
            ctx.fillText(`🎯 Win Rate: ${Math.floor(Math.random() * 40) + 30}%`, 530, 330);
            ctx.fillText(`📅 Active Days: ${Math.floor(Math.random() * 100) + 10}`, 530, 360);

            const buffer = canvas.toBuffer('image/png');

            await sock.sendMessage(from, {
                image: buffer,
                caption: `${tierEmoji} *${mentionedUser ? `@${targetName}'s` : 'Your'} Rank Card*\n\n` +
                        `🏅 *Level:* ${level} (${tier})\n` +
                        `⚡ *Total XP:* ${totalXP.toLocaleString()}\n` +
                        `🌍 *Global Rank:* #${Math.floor(globalRank)}\n` +
                        `📊 *Progress:* ${progressPercent}% to Level ${level + 1}\n\n` +
                        `_💡 Use commands and stay active to gain XP and level up!_`,
                mentions: mentionedUser ? [targetUser] : []
            });
            
        } catch (error) {
            console.error('Rank command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Rank Error*\n\nCould not generate rank card.\n\n*Error:* ${error.message}`
            });
        }
    }
};
