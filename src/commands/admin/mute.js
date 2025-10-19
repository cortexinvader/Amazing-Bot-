import { updateUser } from '../../models/User.js';
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'mute',
    aliases: ['silence', 'muteuser'],
    category: 'admin',
    description: 'Mute a user from using bot commands',
    usage: 'mute @user OR reply to message [duration] [reason]',
    example: 'mute @user 1h spamming',
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
            let duration = '1h';
            let reason = 'No reason provided';

            if (quotedUser) {
                targetJid = quotedUser;
                duration = args[0] || '1h';
                reason = args.slice(1).join(' ') || reason;
            } else if (mentionedUsers.length > 0) {
                targetJid = mentionedUsers[0];
                duration = args[1] || '1h';
                reason = args.slice(2).join(' ') || reason;
            } else {
                return await sock.sendMessage(from, {
                    text: formatResponse.error('NO TARGET',
                        'Reply to a message or mention a user to mute',
                        'Usage: mute @user [duration] [reason]')
                }, { quoted: message });
            }

            if (targetJid === sender) {
                return await sock.sendMessage(from, {
                    text: formatResponse.error('INVALID ACTION',
                        'You cannot mute yourself')
                }, { quoted: message });
            }

            let muteMs;
            if (duration.includes('s')) {
                muteMs = parseInt(duration) * 1000;
            } else if (duration.includes('m')) {
                muteMs = parseInt(duration) * 60 * 1000;
            } else if (duration.includes('h')) {
                muteMs = parseInt(duration) * 60 * 60 * 1000;
            } else if (duration.includes('d')) {
                muteMs = parseInt(duration) * 24 * 60 * 60 * 1000;
            } else {
                muteMs = 60 * 60 * 1000;
            }

            const muteUntil = new Date(Date.now() + muteMs);

            await updateUser(targetJid, {
                $set: {
                    isMuted: true,
                    muteReason: reason,
                    muteUntil: muteUntil,
                    mutedBy: sender
                }
            });

            const targetNumber = targetJid.split('@')[0];
            await sock.sendMessage(from, {
                text: `╭──⦿【 🔇 USER MUTED 】
│
│ 👤 𝗨𝘀𝗲𝗿: @${targetNumber}
│ ⏱️ 𝗗𝘂𝗿𝗮𝘁𝗶𝗼𝗻: ${duration}
│ ⏰ 𝗨𝗻𝘁𝗶𝗹: ${muteUntil.toLocaleString()}
│ 📝 𝗥𝗲𝗮𝘀𝗼𝗻: ${reason}
│ 👮 𝗠𝘂𝘁𝗲𝗱 𝗯𝘆: @${sender.split('@')[0]}
│
│ ⚠️ User cannot use bot commands until mute expires
│
╰────────────⦿`,
                mentions: [targetJid, sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('MUTE FAILED',
                    'Failed to mute user',
                    error.message)
            }, { quoted: message });
        }
    }
};
