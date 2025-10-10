import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';

export default {
    name: 'trigger',
    aliases: ['triggered', 'angry'],
    category: 'fun',
    description: 'Create TRIGGERED meme with profile picture',
    usage: 'trigger [@user]',
    example: 'trigger\ntrigger @user',
    cooldown: 8,
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
                react: { text: '😡', key: message.key }
            });

            const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const targetJid = mentionedJid || sender;

            const statusMsg = await sock.sendMessage(from, {
                text: '╭──⦿【 😡 GENERATING 】\n│ 🎭 𝗧𝘆𝗽𝗲: TRIGGERED Meme\n│ ⏳ 𝗣𝗹𝗲𝗮𝘀𝗲 𝘄𝗮𝗶𝘁: Creating...\n╰────────⦿'
            }, { quoted: message });

            const canvas = createCanvas(512, 680);
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#ff0000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < 100; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = Math.random() * 50 + 10;
                ctx.fillStyle = `rgba(255, ${Math.random() * 100}, 0, ${Math.random() * 0.3})`;
                ctx.fillRect(x, y, size, size);
            }

            let avatarUrl;
            try {
                avatarUrl = await sock.profilePictureUrl(targetJid, 'image');
            } catch {
                avatarUrl = 'https://i.ibb.co/2M7rtLk/ilom.jpg';
            }

            const avatar = await loadImage(avatarUrl);
            
            const offsetX = (Math.random() - 0.5) * 10;
            const offsetY = (Math.random() - 0.5) * 10;
            const rotation = (Math.random() - 0.5) * 0.2;
            
            ctx.save();
            ctx.translate(canvas.width / 2 + offsetX, 256 + offsetY);
            ctx.rotate(rotation);
            ctx.filter = 'saturate(200%) contrast(150%) brightness(110%)';
            ctx.drawImage(avatar, -200, -200, 400, 400);
            ctx.restore();

            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 8;
            ctx.font = 'bold 80px Impact';
            ctx.textAlign = 'center';
            
            ctx.strokeText('TRIGGERED', canvas.width / 2, 600);
            ctx.fillText('TRIGGERED', canvas.width / 2, 600);

            const buffer = canvas.toBuffer('image/png');

            await sock.sendMessage(from, { delete: statusMsg.key });

            await sock.sendMessage(from, {
                image: buffer,
                caption: `╭──⦿【 😡 TRIGGERED 】
│ 👤 𝗩𝗶𝗰𝘁𝗶𝗺: @${targetJid.split('@')[0]}
│ 🎭 𝗠𝗲𝗺𝗲: Generated
│ 📏 𝗦𝗶𝘇𝗲: 512x680px
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
            console.error('Trigger command error:', error);
            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: ${error.message}\n╰────────⦿`
            }, { quoted: message });
        }
    }
};