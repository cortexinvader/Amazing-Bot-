import { updateUser, getUser  } from '../../models/User.js';



export default {
    name: 'warn',
    aliases: ['warning', 'warnuser'],
    category: 'admin',
    description: 'Give a warning to a user',
    usage: 'warn [@user] [reason]',
    cooldown: 5,
    permissions: ['admin'],

    async execute({ sock, message, args, from, user, isGroup, isGroupAdmin }) {
        if (!isGroupAdmin) {
            return await sock.sendMessage(from, {
                text: '❌ *Admin Only*\n\nYou need to be a group admin to use this command.'
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
                    text: '❌ *No Target*\n\nReply to a message or mention a user to warn.\n\n*Usage:* .warn [@user] [reason]'
                }, { quoted: message });
            }

            const reason = args.slice(1).join(' ') || 'No reason provided';
            const sender = message.key.participant || from;

            if (targetJid === sender) {
                return await sock.sendMessage(from, {
                    text: '❌ *Invalid Action*\n\nYou cannot warn yourself.'
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
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            };

            await updateUser(targetJid, {
                $push: { warnings: newWarning }
            });

            const updatedUser = await getUser(targetJid);
            const warningCount = updatedUser?.warnings?.length || 1;

            let responseText = `⚠️ *User Warned*\n\n*Target:* @${targetJid.split('@')[0]}\n*Reason:* ${reason}\n*Warned by:* @${sender.split('@')[0]}\n*Warning #:* ${warningCount}/3\n*Expires:* 24 hours`;

            if (warningCount >= 3) {
                await updateUser(targetJid, {
                    $set: {
                        isBanned: true,
                        banReason: 'Too many warnings (3/3)',
                        bannedBy: 'System',
                        banUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
                    }
                });
                responseText += '\n\n🚫 *AUTO-BAN:* User has been banned for 24 hours due to 3 warnings.';
            }

            await sock.sendMessage(from, {
                text: responseText,
                mentions: [targetJid, sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to warn user. Please try again.'
            }, { quoted: message });
        }
    }
};