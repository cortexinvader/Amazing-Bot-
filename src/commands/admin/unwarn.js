import { updateUser, getUser } from '../../models/User.js';

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
            let amount = 1;

            if (quotedUser) {
                targetJid = quotedUser;
                amount = parseInt(args[0]) || 1;
            } else if (mentionedUsers.length > 0) {
                targetJid = mentionedUsers[0];
                amount = parseInt(args[1]) || 1;
            } else {
                return await sock.sendMessage(from, {
                    text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: No target\n│\n│ 💡 Reply or mention user\n╰────────⦿'
                }, { quoted: message });
            }

            const targetUser = await getUser(targetJid);
            if (!targetUser || !targetUser.warnings || targetUser.warnings.length === 0) {
                return await sock.sendMessage(from, {
                    text: '╭──⦿【 ℹ️ INFO 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: No warnings\n│\n│ 💡 User has no warnings\n╰────────⦿'
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
│ ✅ Clean record
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
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Unwarn failed\n│\n│ 💡 Try again later\n╰────────⦿'
            }, { quoted: message });
        }
    }
};