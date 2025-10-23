import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'promote',
    aliases: ['promoteuser', 'makeadmin'],
    category: 'admin',
    description: 'Give admin privileges to a user',
    usage: 'promote @user OR reply to message',
    cooldown: 5,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, args, from, isGroup, isGroupAdmin, isBotAdmin}) {
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

        if (!isBotAdmin) {
            return await sock.sendMessage(from, {
                text: formatResponse.error('BOT NOT ADMIN',
                    'I need to be an admin to promote users',
                    'Make me an admin first')
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
                        'Reply to a message or mention a user to promote',
                        'Usage: promote @user OR reply to message and type: promote')
                }, { quoted: message });
            }

            const groupMetadata = await sock.groupMetadata(from);
            const targetUser = groupMetadata.participants.find(p => p.id === targetJid);

            if (!targetUser) {
                return await sock.sendMessage(from, {
                    text: formatResponse.error('USER NOT FOUND',
                        'This user is not in the group')
                }, { quoted: message });
            }

            if (targetUser.admin === 'admin' || targetUser.admin === 'superadmin') {
                return await sock.sendMessage(from, {
                    text: formatResponse.info('ALREADY ADMIN',
                        ['This user is already an admin'])
                }, { quoted: message });
            }

            await sock.groupParticipantsUpdate(from, [targetJid], 'promote');

            const targetNumber = targetJid.split('@')[0];
            await sock.sendMessage(from, {
                text: `╭──⦿【 👑 USER PROMOTED 】
│
│ 👤 𝗨𝘀𝗲𝗿: @${targetNumber}
│ ⭐ 𝗔𝗰𝘁𝗶𝗼𝗻: Given admin privileges
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
│ ✅ User is now a group admin
│ with special permissions
│
╰────────────⦿`,
                mentions: [targetJid]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('PROMOTION FAILED',
                    'Failed to promote user',
                    'Make sure I have admin permissions')
            }, { quoted: message });
        }
    }
};
