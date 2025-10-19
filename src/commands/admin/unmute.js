import { updateUser } from '../../models/User.js';
import formatResponse from '../../utils/formatUtils.js';

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
                text: formatResponse.error('GROUP ONLY',
                    'This command can only be used in groups')
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return await sock.sendMessage(from, {
                text: formatResponse.error('ADMIN ONLY',
                    'You need to be a group admin to use this command')
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
                    text: formatResponse.error('NO TARGET',
                        'Reply to a message or mention a user to unmute',
                        'Usage: unmute @user OR reply to message')
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
│ ✅ User can now use bot commands again
│
╰────────────⦿`,
                mentions: [targetJid, sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('UNMUTE FAILED',
                    'Failed to unmute user',
                    error.message)
            }, { quoted: message });
        }
    }
};
