import { updateUser, getUser  } from '../../models/User.js';



export default {
    name: 'unwarn',
    aliases: ['removewarn', 'clearwarn'],
    category: 'admin',
    description: 'Remove warnings from a user',
    usage: 'unwarn [@user] [amount]',
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
                    text: '❌ *No Target*\n\nReply to a message or mention a user to remove warnings.\n\n*Usage:* .unwarn [@user] [amount]'
                }, { quoted: message });
            }

            const targetUser = await getUser(targetJid);
            if (!targetUser || !targetUser.warnings || targetUser.warnings.length === 0) {
                return await sock.sendMessage(from, {
                    text: '❌ *No Warnings*\n\nThis user has no active warnings.'
                }, { quoted: message });
            }

            const amount = parseInt(args[1]) || 1;
            const currentWarnings = targetUser.warnings.length;
            const sender = message.key.participant || from;

            if (amount >= currentWarnings) {
                // Remove all warnings
                await updateUser(targetJid, {
                    $set: { warnings: [] }
                });
                
                await sock.sendMessage(from, {
                    text: `✅ *All Warnings Removed*\n\n*Target:* @${targetJid.split('@')[0]}\n*Removed:* ${currentWarnings} warnings\n*Removed by:* @${sender.split('@')[0]}\n\nUser now has a clean record.`,
                    mentions: [targetJid, sender]
                }, { quoted: message });
            } else {
                const updatedWarnings = targetUser.warnings.slice(0, -amount);
                await updateUser(targetJid, {
                    $set: { warnings: updatedWarnings }
                });

                const remainingWarnings = updatedWarnings.length;
                await sock.sendMessage(from, {
                    text: `✅ *Warnings Removed*\n\n*Target:* @${targetJid.split('@')[0]}\n*Removed:* ${amount} warnings\n*Remaining:* ${remainingWarnings} warnings\n*Removed by:* @${sender.split('@')[0]}`,
                    mentions: [targetJid, sender]
                }, { quoted: message });
            }

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to remove warnings. Please try again.'
            }, { quoted: message });
        }
    }
};