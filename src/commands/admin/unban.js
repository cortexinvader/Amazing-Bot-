import { updateUser  } from '../../models/User.js';



export default {
    name: 'unban',
    aliases: ['unblock', 'unbanuser'],
    category: 'admin',
    description: 'Remove ban from a user',
    usage: 'unban [@user]',
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
            } else if (args[0]?.includes('@')) {
                targetJid = args[0].replace('@', '') + '@s.whatsapp.net';
            } else {
                return await sock.sendMessage(from, {
                    text: '❌ *Invalid Target*\n\nReply to a message, mention a user, or provide their number.\n\n*Usage:* .unban [@user]'
                }, { quoted: message });
            }

            await updateUser(targetJid, {
                $set: {
                    isBanned: false,
                    banReason: null,
                    bannedBy: null,
                    banUntil: null
                }
            });

            const targetNumber = targetJid.split('@')[0];
            const sender = message.key.participant || from;
            
            await sock.sendMessage(from, {
                text: `✅ *User Unbanned*\n\n*Target:* +${targetNumber}\n*Unbanned by:* @${sender.split('@')[0]}\n*Date:* ${new Date().toLocaleString()}\n\nUser can now use bot commands again.`,
                mentions: [sender]
            }, { quoted: message });

            try {
                await sock.sendMessage(targetJid, {
                    text: `✅ *You have been unbanned*\n\n*Unbanned by:* @${sender.split('@')[0]}\n\nYou can now use bot commands again. Please follow the rules.`,
                    mentions: [sender]
                });
            } catch (e) {
            }

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to unban user. Please try again.'
            }, { quoted: message });
        }
    }
};