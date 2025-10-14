import { updateUser  } from '../../models/User.js';



export default {
    name: 'unmute',
    aliases: ['unsilence', 'unmuteuser'],
    category: 'admin',
    description: 'Remove mute from a user',
    usage: 'unmute [@user]',
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
                    text: '❌ *No Target*\n\nReply to a message or mention a user to unmute.\n\n*Usage:* .unmute [@user]'
                }, { quoted: message });
            }

            await updateUser(targetJid, {
                $set: {
                    isMuted: false,
                    muteReason: null,
                    muteUntil: null,
                    mutedBy: null
                }
            });

            const targetNumber = targetJid.split('@')[0];
            const sender = message.key.participant || from;
            
            await sock.sendMessage(from, {
                text: `🔊 *User Unmuted*\n\n*Target:* @${targetNumber}\n*Unmuted by:* @${sender.split('@')[0]}\n*Date:* ${new Date().toLocaleString()}\n\nUser can now use bot commands again.`,
                mentions: [targetJid, sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to unmute user. Please try again.'
            }, { quoted: message });
        }
    }
};