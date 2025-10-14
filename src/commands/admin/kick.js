import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'kick',
    aliases: ['remove'],
    category: 'admin',
    description: 'Remove a member from the group',
    usage: 'kick @user OR reply to message',
    cooldown: 3,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, args, from, isGroup, isGroupAdmin, isBotAdmin }) {
        if (!isGroup) {
            return sock.sendMessage(from, {
                text: formatResponse.error('GROUP ONLY',
                    'This command can only be used in groups')
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return sock.sendMessage(from, {
                text: formatResponse.error('ADMIN ONLY',
                    'You need to be a group admin to use this command')
            }, { quoted: message });
        }

        if (!isBotAdmin) {
            return sock.sendMessage(from, {
                text: formatResponse.error('BOT NOT ADMIN',
                    'I need admin privileges to kick members',
                    'Make me an admin first')
            }, { quoted: message });
        }

        try {
            const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            let usersToKick = [];
            if (quotedUser) {
                usersToKick = [quotedUser];
            } else if (mentionedUsers.length > 0) {
                usersToKick = mentionedUsers;
            } else {
                return sock.sendMessage(from, {
                    text: formatResponse.error('NO TARGET',
                        'Reply to a message or mention user(s) to kick',
                        'Usage: kick @user OR reply to message and type: kick')
                }, { quoted: message });
            }
            
            await sock.sendMessage(from, {
                text: `╭──⦿【 ⚠️ KICKING MEMBERS 】
│
│ 🔄 Processing ${usersToKick.length} member(s)...
│
╰────────────⦿`
            }, { quoted: message });

            await sock.groupParticipantsUpdate(from, usersToKick, 'remove');

            const kickedList = usersToKick.map(u => `✧ @${u.split('@')[0]}`).join('\n│ ');
            
            await sock.sendMessage(from, {
                text: `╭──⦿【 ✅ MEMBERS KICKED 】
│
│ 👥 𝗞𝗶𝗰𝗸𝗲𝗱 𝗠𝗲𝗺𝗯𝗲𝗿𝘀:
│ ${kickedList}
│
│ 📊 𝗧𝗼𝘁𝗮𝗹: ${usersToKick.length}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
╰────────────⦿`,
                mentions: usersToKick
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('KICK FAILED', 
                    'Failed to kick user(s)',
                    'They might be admin or I lack permissions')
            }, { quoted: message });
        }
    }
};
