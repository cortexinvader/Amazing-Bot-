import { updateUser, getUser } from '../../models/User.js';
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'warn',
    aliases: ['warning', 'warnuser'],
    category: 'admin',
    description: 'Give a warning to a user',
    usage: 'warn @user OR reply to message [reason]',
    example: 'warn @user breaking rules',
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
            let reason = 'No reason provided';

            if (quotedUser) {
                targetJid = quotedUser;
                reason = args.join(' ') || reason;
            } else if (mentionedUsers.length > 0) {
                targetJid = mentionedUsers[0];
                reason = args.slice(1).join(' ') || reason;
            } else {
                return await sock.sendMessage(from, {
                    text: formatResponse.error('NO TARGET',
                        'Reply to a message or mention a user to warn',
                        'Usage: warn @user [reason] OR reply to message')
                }, { quoted: message });
            }

            if (targetJid === sender) {
                return await sock.sendMessage(from, {
                    text: formatResponse.error('INVALID ACTION',
                        'You cannot warn yourself')
                }, { quoted: message });
            }

            const targetUser = await getUser(targetJid);
            if (!targetUser) {
                await updateUser(targetJid, {
                    jid: targetJid,
                    phone: targetJid.split('@')[0]
                });
            }

            const newWarning = {
                reason: reason,
                warnedBy: sender,
                warnedAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            };

            await updateUser(targetJid, {
                $push: { warnings: newWarning }
            });

            const updatedUser = await getUser(targetJid);
            const warningCount = updatedUser?.warnings?.length || 1;

            let responseText = `╭──⦿【 ⚠️ USER WARNED 】
│
│ 👤 𝗨𝘀𝗲𝗿: @${targetJid.split('@')[0]}
│ 📝 𝗥𝗲𝗮𝘀𝗼𝗻: ${reason}
│ 👮 𝗪𝗮𝗿𝗻𝗲𝗱 𝗯𝘆: @${sender.split('@')[0]}
│ 🔢 𝗪𝗮𝗿𝗻𝗶𝗻𝗴: ${warningCount}/3
│ ⏰ 𝗘𝘅𝗽𝗶𝗿𝗲𝘀: 24 hours
│`;

            if (warningCount >= 3) {
                await updateUser(targetJid, {
                    $set: {
                        isBanned: true,
                        banReason: 'Too many warnings (3/3)',
                        bannedBy: 'System',
                        banUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
                    }
                });
                responseText += `
│
│ 🚫 𝗔𝗨𝗧𝗢-𝗕𝗔𝗡: User has been banned
│ for 24 hours due to 3 warnings
│`;
            }

            responseText += `
╰────────────⦿`;

            await sock.sendMessage(from, {
                text: responseText,
                mentions: [targetJid, sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('WARN FAILED',
                    'Failed to warn user',
                    error.message)
            }, { quoted: message });
        }
    }
};
