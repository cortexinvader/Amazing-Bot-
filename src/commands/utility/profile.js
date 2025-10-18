import { getUser } from '../../models/User.js';
import config from '../../config.js';

const userMessageCounts = new Map();
const userDeletedCounts = new Map();
const userJoinDates = new Map();

export default {
    name: 'profile',
    aliases: ['prof', 'whois'],
    category: 'utility',
    description: 'View detailed user profile with stats and status',
    usage: 'profile [@user/reply]',
    example: 'profile\nprofile @user',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: true,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, from, sender, isGroup, prefix }) {
        let targetSender = sender;

        const replied = message.message?.extendedTextMessage?.contextInfo?.participant;
        if (replied) {
            targetSender = replied;
        } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
            targetSender = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }

        try {
            await sock.sendMessage(from, {
                react: { text: '👤', key: message.key }
            });

            const statusMsg = await sock.sendMessage(from, {
                text: '⏳ Loading profile...'
            }, { quoted: message });

            const userData = await getUser(targetSender);
            const userName = userData?.name || message.pushName || 'Unknown User';
            const phone = targetSender.split('@')[0];

            let profilePic = null;
            try {
                profilePic = await sock.profilePictureUrl(targetSender, 'image');
            } catch (e) {
                profilePic = null;
            }

            let onlineStatus = '🔴 Offline';
            let lastSeenTime = null;

            try {
                await sock.presenceSubscribe(targetSender);
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                const presenceStore = sock.presenceCache || new Map();
                const userPresence = presenceStore.get(targetSender);

                if (userPresence) {
                    const presence = userPresence.lastKnownPresence;
                    const lastSeen = userPresence.lastSeen;

                    if (presence === 'available') {
                        onlineStatus = '🟢 Online';
                    } else if (presence === 'composing') {
                        onlineStatus = '💬 Typing...';
                    } else if (presence === 'recording') {
                        onlineStatus = '🎤 Recording...';
                    } else if (lastSeen) {
                        lastSeenTime = new Date(lastSeen * 1000);
                        const now = new Date();
                        const diffMs = now - lastSeenTime;
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMins / 60);
                        const diffDays = Math.floor(diffHours / 24);

                        if (diffMins < 1) {
                            onlineStatus = '🟡 Just now';
                        } else if (diffMins < 60) {
                            onlineStatus = `🟡 ${diffMins}m ago`;
                        } else if (diffHours < 24) {
                            onlineStatus = `🟠 ${diffHours}h ago`;
                        } else {
                            onlineStatus = `🔴 ${diffDays}d ago`;
                        }
                    }
                }
            } catch (e) {
                onlineStatus = '🔴 Offline';
            }

            let bio = 'No bio set';
            try {
                const statusResponse = await sock.fetchStatus(targetSender);
                if (statusResponse?.status) {
                    bio = statusResponse.status;
                }
            } catch (e) {}

            let messageCount = 0;
            let deletedCount = 0;
            let joinDate = 'Unknown';
            let groupRole = '👤 Member';

            if (isGroup) {
                const msgKey = `${targetSender}_${from}`;
                messageCount = userMessageCounts.get(msgKey) || 0;
                deletedCount = userDeletedCounts.get(msgKey) || 0;
                
                const joinTs = userJoinDates.get(msgKey);
                if (joinTs) {
                    const date = new Date(joinTs);
                    joinDate = date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    });
                }

                try {
                    const groupMetadata = await sock.groupMetadata(from);
                    const participant = groupMetadata.participants.find(p => 
                        p.id === targetSender || 
                        (p.lid && p.lid === targetSender)
                    );
                    
                    if (participant) {
                        if (participant.admin === 'superadmin') {
                            groupRole = '👑 Owner';
                        } else if (participant.admin === 'admin') {
                            groupRole = '⭐ Admin';
                        } else {
                            groupRole = '👤 Member';
                        }
                    }
                } catch (e) {}
            }

            const isBanned = userData?.isBanned || false;
            const isPremium = userData?.isPremium || false;
            const commandsUsed = userData?.commandsUsed || 0;
            const warnings = userData?.warnings || 0;
            const level = userData?.level || 1;
            const experience = userData?.experience || 0;

            await sock.sendMessage(from, { delete: statusMsg.key });

            let profileText = `👤 USER PROFILE\n\n`;
            profileText += `📛 Name: ${userName}\n`;
            profileText += `📱 Phone: +${phone}\n`;
            profileText += `🆔 Status: ${onlineStatus}\n`;
            profileText += `📝 Bio: ${bio}\n\n`;

            if (isGroup) {
                profileText += `👥 GROUP STATS\n\n`;
                profileText += `🎭 Role: ${groupRole}\n`;
                profileText += `💬 Messages: ${messageCount}\n`;
                profileText += `🗑️ Deleted: ${deletedCount}\n`;
                profileText += `📅 Joined: ${joinDate}\n\n`;
            }

            profileText += `🤖 BOT STATS\n\n`;
            profileText += `⚡ Commands: ${commandsUsed}\n`;
            profileText += `🎯 Level: ${level}\n`;
            profileText += `✨ XP: ${experience}\n`;
            profileText += `⚠️ Warnings: ${warnings}\n`;
            if (isPremium) profileText += `⭐ Premium User\n`;
            if (isBanned) profileText += `🚫 Banned\n`;

            if (profilePic) {
                await sock.sendMessage(from, {
                    image: { url: profilePic },
                    caption: profileText,
                    mentions: targetSender !== sender ? [targetSender] : []
                }, { quoted: message });
            } else {
                await sock.sendMessage(from, {
                    text: profileText,
                    mentions: targetSender !== sender ? [targetSender] : []
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Profile command error:', error);
            await sock.sendMessage(from, {
                text: `❌ Failed to load profile\n\n⚠️ ${error.message}`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};

export function trackMessage(sender, from, isDeleted = false) {
    const msgKey = `${sender}_${from}`;
    
    if (!userMessageCounts.has(msgKey)) {
        userMessageCounts.set(msgKey, 0);
        userJoinDates.set(msgKey, Date.now());
    }
    
    if (isDeleted) {
        const current = userDeletedCounts.get(msgKey) || 0;
        userDeletedCounts.set(msgKey, current + 1);
    } else {
        const current = userMessageCounts.get(msgKey) || 0;
        userMessageCounts.set(msgKey, current + 1);
    }
}

export function getMessageCount(sender, from) {
    return userMessageCounts.get(`${sender}_${from}`) || 0;
}

export function getDeletedCount(sender, from) {
    return userDeletedCounts.get(`${sender}_${from}`) || 0;
}

export function clearUserStats(sender, from) {
    const msgKey = `${sender}_${from}`;
    userMessageCounts.delete(msgKey);
    userDeletedCounts.delete(msgKey);
    userJoinDates.delete(msgKey);
}