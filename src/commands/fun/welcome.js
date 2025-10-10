import { createCanvas, loadImage } from 'canvas';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default {
    name: 'welcome',
    aliases: ['welcomecard', 'greet'],
    category: 'fun',
    description: 'Generate stunning welcome cards with user profile picture',
    usage: 'welcome [@user]',
    example: 'welcome\nwelcome @user',
    cooldown: 10,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 1,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            await sock.sendMessage(from, {
                react: { text: '🎉', key: message.key }
            });

            const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const targetJid = mentionedJid || sender;
            const pushName = mentionedJid ? '' : (message.pushName || 'User');

            const statusMsg = await sock.sendMessage(from, {
                text: '╭──⦿【 🎨 CREATING 】\n│ 🎉 𝗧𝘆𝗽𝗲: Welcome Card\n│ ⏳ 𝗣𝗹𝗲𝗮𝘀𝗲 𝘄𝗮𝗶𝘁: Processing...\n╰────────⦿'
            }, { quoted: message });

            const canvas = createCanvas(1200, 600);
            const ctx = canvas.getContext('2d');

            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(0.5, '#764ba2');
            gradient.addColorStop(1, '#f093fb');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < 30; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = Math.random() * 3 + 1;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.roundRect(ctx, 50, 50, canvas.width - 100, canvas.height - 100, 30);
            ctx.fill();

            let avatarUrl;
            try {
                avatarUrl = await sock.profilePictureUrl(targetJid, 'image');
            } catch {
                avatarUrl = 'https://i.ibb.co/2M7rtLk/ilom.jpg';
            }

            const avatar = await loadImage(avatarUrl);
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(canvas.width / 2, 220, 100, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, canvas.width / 2 - 100, 120, 200, 200);
            ctx.restore();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, 220, 100, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 60px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('WELCOME!', canvas.width / 2, 380);

            ctx.font = 'bold 45px Arial';
            const displayName = pushName || targetJid.split('@')[0];
            ctx.fillText(displayName, canvas.width / 2, 450);

            ctx.font = '30px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            if (isGroup) {
                const groupMeta = await sock.groupMetadata(from);
                ctx.fillText(`Member #${groupMeta.participants.length}`, canvas.width / 2, 500);
            } else {
                ctx.fillText('Welcome to the chat!', canvas.width / 2, 500);
            }

            const buffer = canvas.toBuffer('image/png');

            await sock.sendMessage(from, { delete: statusMsg.key });

            await sock.sendMessage(from, {
                image: buffer,
                caption: `╭──⦿【 🎉 WELCOME 】
│ 👤 𝗨𝘀𝗲𝗿: @${targetJid.split('@')[0]}
│ 🎨 𝗤𝘂𝗮𝗹𝗶𝘁𝘆: HD
│ 📏 𝗦𝗶𝘇𝗲: 1200x600px
╰────────⦿

╭─────────────⦿
│💫 | [ Ilom Bot 🍀 ]
╰────────────⦿`,
                mentions: [targetJid]
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Welcome command error:', error);
            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: ${error.message}\n╰────────⦿`
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