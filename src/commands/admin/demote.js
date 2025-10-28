import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'demote',
    aliases: ['demoteuser', 'removeadmin'],
    category: 'admin',
    description: 'Remove admin privileges from a user',
    usage: 'demote @user OR reply to message',
    cooldown: 5,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, from, isGroup, isGroupAdmin, isBotAdmin }) {
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
                    'I need to be an admin to demote users',
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
                        'Reply to a message or mention a user to demote',
                        'Usage: demote @user OR reply to message and type: demote')
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

            if (targetUser.admin !== 'admin' && targetUser.admin !== 'superadmin') {
                return await sock.sendMessage(from, {
                    text: formatResponse.info('NOT ADMIN',
                        ['This user is not an admin'])
                }, { quoted: message });
            }

            await sock.groupParticipantsUpdate(from, [targetJid], 'demote');

            const targetNumber = targetJid.split('@')[0];
            await sock.sendMessage(from, {
                text: `╭──⦿【 👤 USER DEMOTED 】
│
│ 👤 𝗨𝘀𝗲𝗿: @${targetNumber}
│ ⬇️ 𝗔𝗰𝘁𝗶𝗼𝗻: Removed admin privileges
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
│ ✅ User is now a regular member
│
╰────────────⦿`,
                mentions: [targetJid]
            }, { quoted: message });

        } catch (error) {
            console.error('Demote command error:', error);
            await sock.sendMessage(from, {
                text: formatResponse.error('DEMOTION FAILED',
                    'Failed to demote user',
                    'Make sure I have admin permissions and the target is an admin')
            }, { quoted: message });
        }
    }
};