import { getUser } from '../../models/User.js';
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'profile',
    aliases: ['userinfo', 'me', 'stats'],
    category: 'general',
    description: 'View your profile or another user\'s profile',
    usage: 'profile [@user] OR reply to message',
    example: 'profile @user',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, sender, isOwner }) {
        try {
            const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            let targetJid = sender;
            if (quotedUser) {
                targetJid = quotedUser;
            } else if (mentionedUsers.length > 0) {
                targetJid = mentionedUsers[0];
            }

            const user = await getUser(targetJid);
            if (!user) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('USER NOT FOUND',
                        'Unable to fetch user data from database')
                }, { quoted: message });
            }

            const targetNumber = targetJid.split('@')[0];
            const name = user.name || 'Unknown';
            const isSelf = targetJid === sender;

            const level = user.economy?.level || 1;
            const xp = user.economy?.xp || 0;
            const nextLevelXp = level * 100;
            const xpProgress = Math.min(Math.round((xp / nextLevelXp) * 100), 100);
            const progressBar = '█'.repeat(Math.floor(xpProgress / 10)) + '░'.repeat(10 - Math.floor(xpProgress / 10));

            const balance = user.economy?.balance || 0;
            const bank = user.economy?.bank || 0;
            const totalMoney = balance + bank;
            const rank = user.economy?.rank || 'Beginner';
            const dailyStreak = user.economy?.dailyStreak || 0;

            const commandsUsed = user.statistics?.commandsUsed || 0;
            const messagesSent = user.statistics?.messagesSent || 0;
            const joinedAt = user.statistics?.joinedAt ? new Date(user.statistics.joinedAt).toLocaleDateString() : 'Unknown';
            const lastActive = user.statistics?.lastActive ? new Date(user.statistics.lastActive).toLocaleString() : 'Unknown';

            const gamesPlayed = user.gameStats?.gamesPlayed || 0;
            const gamesWon = user.gameStats?.gamesWon || 0;
            const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;

            const isPremium = user.isPremium || false;
            const premiumBadge = isPremium ? '👑 PREMIUM' : '🆓 FREE';
            const isBanned = user.isBanned || false;
            const bannedBadge = isBanned ? '🚫 BANNED' : '';
            const isMuted = user.isMuted || false;
            const mutedBadge = isMuted ? '🔇 MUTED' : '';

            const warnings = user.warnings?.length || 0;
            const warningBadge = warnings > 0 ? `⚠️ ${warnings} Warning${warnings > 1 ? 's' : ''}` : '';

            const badges = [premiumBadge, bannedBadge, mutedBadge, warningBadge].filter(b => b).join(' | ');

            let profilePicUrl;
            try {
                profilePicUrl = await sock.profilePictureUrl(targetJid, 'image');
            } catch (err) {
                profilePicUrl = 'https://i.ibb.co/2M7rtLk/ilom.jpg';
            }

            const profileText = `╭──⦿【 👤 ${isSelf ? 'YOUR PROFILE' : 'USER PROFILE'} 】
│
│ 👤 𝗡𝗮𝗺𝗲: ${name}
│ 📞 𝗡𝘂𝗺𝗯𝗲𝗿: @${targetNumber}
│ ${badges}
│
╰────────────⦿

╭──⦿【 💰 ECONOMY 】
│
│ 💵 𝗕𝗮𝗹𝗮𝗻𝗰𝗲: $${balance.toLocaleString()}
│ 🏦 𝗕𝗮𝗻𝗸: $${bank.toLocaleString()}
│ 💎 𝗧𝗼𝘁𝗮𝗹 𝗪𝗲𝗮𝗹𝘁𝗵: $${totalMoney.toLocaleString()}
│ 🏆 𝗥𝗮𝗻𝗸: ${rank}
│ 🔥 𝗗𝗮𝗶𝗹𝘆 𝗦𝘁𝗿𝗲𝗮𝗸: ${dailyStreak} days
│
╰────────────⦿

╭──⦿【 ⭐ LEVEL & XP 】
│
│ 🎯 𝗟𝗲𝘃𝗲𝗹: ${level}
│ ✨ 𝗫𝗣: ${xp}/${nextLevelXp}
│ 📊 𝗣𝗿𝗼𝗴𝗿𝗲𝘀𝘀: ${xpProgress}%
│ ${progressBar}
│
╰────────────⦿

╭──⦿【 🎮 GAMING STATS 】
│
│ 🎲 𝗚𝗮𝗺𝗲𝘀 𝗣𝗹𝗮𝘆𝗲𝗱: ${gamesPlayed}
│ 🏆 𝗚𝗮𝗺𝗲𝘀 𝗪𝗼𝗻: ${gamesWon}
│ 📈 𝗪𝗶𝗻 𝗥𝗮𝘁𝗲: ${winRate}%
│
╰────────────⦿

╭──⦿【 📊 ACTIVITY STATS 】
│
│ ⚡ 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀 𝗨𝘀𝗲𝗱: ${commandsUsed}
│ 💬 𝗠𝗲𝘀𝘀𝗮𝗴𝗲𝘀 𝗦𝗲𝗻𝘁: ${messagesSent}
│ 📅 𝗝𝗼𝗶𝗻𝗲𝗱: ${joinedAt}
│ ⏰ 𝗟𝗮𝘀𝘁 𝗔𝗰𝘁𝗶𝘃𝗲: ${lastActive}
│
╰────────────⦿`;

            await sock.sendMessage(from, {
                image: { url: profilePicUrl },
                caption: profileText,
                mentions: [targetJid, sender]
            }, { quoted: message });

        } catch (error) {
            console.error('Profile command error:', error);
            await sock.sendMessage(from, {
                text: formatResponse.error('PROFILE ERROR',
                    'Failed to fetch profile information',
                    error.message)
            }, { quoted: message });
        }
    }
};
