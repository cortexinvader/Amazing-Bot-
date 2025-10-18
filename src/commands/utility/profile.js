import { getUser } from '../../models/User.js';
import config from '../../config.js';

const userMessageCounts = new Map(); // Key: userId_groupId, Value: count
const userDeletedCounts = new Map(); // Key: userId_groupId, Value: deleted count
const userJoinDates = new Map(); // Key: userId_groupId, Value: join timestamp

export default {
    name: 'profile',
    aliases: ['prof', 'info'],
    category: 'utility',
    description: 'View minimal user profile',
    usage: 'profile [reply/tag @user]',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    supportsReply: true,
    supportsChat: true,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, from, sender, isGroup, prefix }) {
        let targetSender = sender 

        const replied = message.message?.extendedTextMessage?.contextInfo?.participant;
        if (replied) {
            targetSender = replied;
        } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
            targetSender = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }

        try {
            const userData = await getUser(targetSender);
            const userName = userData.name || 'Unknown';

            let profilePic = null;
            try {
                profilePic = await sock.profilePictureUrl(targetSender, 'image');
            } catch {}

            let onlineStatus = 'Offline';
            try {
                const presence = await sock.fetchPresence(targetSender);
                onlineStatus = presence === 'available' ? 'Online' : presence === 'composing' ? 'Typing' : 'Offline';
            } catch {}

            let bio = userData.bio || 'No bio';
            let lastSeen = userData.lastSeen || 'Unknown';

            let messageCount = 0;
            let deletedCount = 0;
            let joinDate = userData.joinDate || 'Unknown';

            if (isGroup) {
                const msgKey = `${targetSender}_${from}`;
                messageCount = userMessageCounts.get(msgKey) || 0;
                deletedCount = userDeletedCounts.get(msgKey) || 0;
                const joinTs = userJoinDates.get(msgKey);
                if (joinTs) {
                    joinDate = new Date(joinTs).toLocaleDateString();
                }
            }

            let profileText = `👤 ${userName}\n\n`;
            profileText += `🆔 JID: ${targetSender}\n`;
            profileText += `🟢 Status: ${onlineStatus}\n`;
            profileText += `📝 Bio: ${bio}\n`;
            profileText += `🕐 Last Seen: ${lastSeen}\n`;
            if (isGroup) {
                profileText += `💬 Messages: ${messageCount}\n`;
                profileText += `🗑️ Deleted: ${deletedCount}\n`;
                profileText += `📅 Joined: ${joinDate}\n`;
            }
            profileText += `\n💫 Powered by ${config.botName}`;

            if (profilePic) {
                await sock.sendMessage(from, {
                    image: { url: profilePic },
                    caption: profileText,
                    contextInfo: targetSender !== sender ? { mentionedJid: [targetSender] } : {}
                }, { quoted: message });
            } else {
                await sock.sendMessage(from, {
                    text: profileText,
                    contextInfo: targetSender !== sender ? { mentionedJid: [targetSender] } : {}
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Profile command error:', error);
            await sock.sendMessage(from, {
                text: `❌ Error fetching profile: ${error.message}`
            }, { quoted: message });
        }
    }
};