import { updateUser  } from '../../models/User.js';



export default {
    name: 'mute',
    aliases: ['silence', 'muteuser'],
    category: 'admin',
    description: 'Mute a user from using bot commands',
    usage: 'mute [@user] [duration] [reason]',
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
                    text: '❌ *No Target*\n\nReply to a message or mention a user to mute.\n\n*Usage:* .mute [@user] [duration] [reason]'
                }, { quoted: message });
            }

            const sender = message.key.participant || from;
            if (targetJid === sender) {
                return await sock.sendMessage(from, {
                    text: '❌ *Invalid Action*\n\nYou cannot mute yourself.'
                }, { quoted: message });
            }

            const duration = args[1] || '1h';
            const reason = args.slice(2).join(' ') || 'No reason provided';

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
                muteMs = 60 * 60 * 1000; // Default 1 hour
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
                text: `🔇 *User Muted*\n\n*Target:* @${targetNumber}\n*Duration:* ${duration}\n*Until:* ${muteUntil.toLocaleString()}\n*Reason:* ${reason}\n*Muted by:* @${sender.split('@')[0]}\n\nUser cannot use bot commands until mute expires.`,
                mentions: [targetJid, sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to mute user. Please try again.'
            }, { quoted: message });
        }
    }
};