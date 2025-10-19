import { updateUser, getUser } from '../../models/User.js';
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'unwarn',
    aliases: ['removewarn', 'clearwarn'],
    category: 'admin',
    description: 'Remove warnings from a user',
    usage: 'unwarn @user OR reply to message [amount]',
    example: 'unwarn @user 1',
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
            let amount = 1;

            if (quotedUser) {
                targetJid = quotedUser;
                amount = parseInt(args[0]) || 1;
            } else if (mentionedUsers.length > 0) {
                targetJid = mentionedUsers[0];
                amount = parseInt(args[1]) || 1;
            } else {
                return await sock.sendMessage(from, {
                    text: formatResponse.error('NO TARGET',
                        'Reply to a message or mention a user to remove warnings',
                        'Usage: unwarn @user [amount] OR reply to message')
                }, { quoted: message });
            }

            const targetUser = await getUser(targetJid);
            if (!targetUser || !targetUser.warnings || targetUser.warnings.length === 0) {
                return await sock.sendMessage(from, {
                    text: formatResponse.info('NO WARNINGS',
                        ['This user has no active warnings'])
                }, { quoted: message });
            }

            const currentWarnings = targetUser.warnings.length;

            if (amount >= currentWarnings) {
                await updateUser(targetJid, {
                    $set: { warnings: [] }
                });
                
                const targetNumber = targetJid.split('@')[0];
                await sock.sendMessage(from, {
                    text: `╭──⦿【 ✅ WARNINGS CLEARED 】
│
│ 👤 𝗨𝘀𝗲𝗿: @${targetNumber}
│ 🔢 𝗥𝗲𝗺𝗼𝘃𝗲𝗱: ${currentWarnings} warnings
│ 👮 𝗕𝘆: @${sender.split('@')[0]}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
│ ✅ User now has a clean record
│
╰────────────⦿`,
                    mentions: [targetJid, sender]
                }, { quoted: message });
            } else {
                const updatedWarnings = targetUser.warnings.slice(0, -amount);
                await updateUser(targetJid, {
                    $set: { warnings: updatedWarnings }
                });

                const remainingWarnings = updatedWarnings.length;
                const targetNumber = targetJid.split('@')[0];
                await sock.sendMessage(from, {
                    text: `╭──⦿【 ✅ WARNINGS REMOVED 】
│
│ 👤 𝗨𝘀𝗲𝗿: @${targetNumber}
│ 🔢 𝗥𝗲𝗺𝗼𝘃𝗲𝗱: ${amount} warnings
│ 📊 𝗥𝗲𝗺𝗮𝗶𝗻𝗶𝗻𝗴: ${remainingWarnings}/3
│ 👮 𝗕𝘆: @${sender.split('@')[0]}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
╰────────────⦿`,
                    mentions: [targetJid, sender]
                }, { quoted: message });
            }

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('UNWARN FAILED',
                    'Failed to remove warnings',
                    error.message)
            }, { quoted: message });
        }
    }
};
