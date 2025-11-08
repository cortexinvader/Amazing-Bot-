import { updateUser } from '../../models/User.js';

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
                    text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: No target\n│\n│ 💡 Reply or mention user\n╰────────⦿'
                }, { quoted: message });
            }

            if (targetJid === sender) {
                return await sock.sendMessage(from, {
                    text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Cannot mute yourself\n│\n│ 💡 Invalid action\n╰────────⦿'
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
│ ⚠️ Cannot use bot commands
│
╰────────────⦿`,
                mentions: [targetJid, sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Mute failed\n│\n│ 💡 Try again later\n╰────────⦿'
            }, { quoted: message });
        }
    }
};