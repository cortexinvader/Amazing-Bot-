import { updateUser, getUser } from '../../models/User.js';

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
            let reason = 'No reason provided';

            if (quotedUser) {
                targetJid = quotedUser;
                reason = args.join(' ') || reason;
            } else if (mentionedUsers.length > 0) {
                targetJid = mentionedUsers[0];
                reason = args.slice(1).join(' ') || reason;
            } else {
                return await sock.sendMessage(from, {
                    text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: No target\n│\n│ 💡 Reply or mention user\n╰────────⦿'
                }, { quoted: message });
            }

            if (targetJid === sender) {
                return await sock.sendMessage(from, {
                    text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Cannot warn yourself\n│\n│ 💡 Invalid action\n╰────────⦿'
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
                        bannedAt: new Date()
                    }
                });
                responseText += `
│
│ 🚫 𝗔𝗨𝗧𝗢-𝗕𝗔𝗡: User banned
│ for 3 warnings
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
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Warn failed\n│\n│ 💡 Try again later\n╰────────⦿'
            }, { quoted: message });
        }
    }
};