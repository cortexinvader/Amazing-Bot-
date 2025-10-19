import { updateUser } from '../../models/User.js';
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'unban',
    aliases: ['unblock', 'unbanuser'],
    category: 'admin',
    description: 'Remove ban from a user',
    usage: 'unban @user OR reply to message',
    example: 'unban @user',
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
            } else if (args[0]) {
                const phone = args[0].replace(/[^0-9]/g, '');
                if (phone.length > 7) {
                    targetJid = phone + '@s.whatsapp.net';
                }
            }

            if (!targetJid) {
                return await sock.sendMessage(from, {
                    text: formatResponse.error('NO TARGET',
                        'Reply to a message, mention a user, or provide their number',
                        'Usage: unban @user OR reply to message')
                }, { quoted: message });
            }

            await updateUser(targetJid, {
                $set: {
                    isBanned: false,
                    banReason: null,
                    bannedBy: null,
                    banUntil: null
                }
            });

            const targetNumber = targetJid.split('@')[0];
            await sock.sendMessage(from, {
                text: `╭──⦿【 ✅ USER UNBANNED 】
│
│ 👤 𝗨𝘀𝗲𝗿: @${targetNumber}
│ 👮 𝗨𝗻𝗯𝗮𝗻𝗻𝗲𝗱 𝗯𝘆: @${sender.split('@')[0]}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
│ ✅ User can now use bot commands again
│
╰────────────⦿`,
                mentions: [targetJid, sender]
            }, { quoted: message });

            try {
                await sock.sendMessage(targetJid, {
                    text: `╭──⦿【 ✅ YOU ARE UNBANNED 】
│
│ 👮 𝗨𝗻𝗯𝗮𝗻𝗻𝗲𝗱 𝗯𝘆: @${sender.split('@')[0]}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
│ ✅ You can now use bot commands
│ Please follow the rules
│
╰────────────⦿`,
                    mentions: [sender]
                });
            } catch (e) {}

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('UNBAN FAILED',
                    'Failed to unban user',
                    error.message)
            }, { quoted: message });
        }
    }
};
