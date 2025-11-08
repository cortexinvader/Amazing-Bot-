import { updateUser } from '../../models/User.js';

export default {
    name: 'unmute',
    aliases: ['unsilence', 'unmuteuser'],
    category: 'admin',
    description: 'Remove mute from a user',
    usage: 'unmute @user OR reply to message',
    example: 'unmute @user',
    cooldown: 5,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, args, from, sender, isGroup, isGroupAdmin }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Group only command\n│\n│ 💡 This command works in groups\n╰────────⦿'
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return await sock.sendMessage(from, {
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Admin only\n│\n│ 💡 You need admin privileges\n╰────────⦿'
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
                return await sock.sendMessage(from, {
                    text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: No target\n│\n│ 💡 Reply or mention user\n╰────────⦿'
                }, { quoted: message });
            }

            await updateUser(targetJid, {
                $set: {
                    isMuted: false,
                    muteReason: null,
                    muteUntil: null,
                    mutedBy: null
                }
            });

            const targetNumber = targetJid.split('@')[0];
            await sock.sendMessage(from, {
                text: `╭──⦿【 🔊 USER UNMUTED 】
│
│ 👤 𝗨𝘀𝗲𝗿: @${targetNumber}
│ 👮 𝗨𝗻𝗺𝘂𝘁𝗲𝗱 𝗯𝘆: @${sender.split('@')[0]}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
│ ✅ Can use bot commands again
│
╰────────────⦿`,
                mentions: [targetJid, sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Unmute failed\n│\n│ 💡 Try again later\n╰────────⦿'
            }, { quoted: message });
        }
    }
};