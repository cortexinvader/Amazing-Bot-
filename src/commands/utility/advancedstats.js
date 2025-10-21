import { getUser } from '../../models/User.js';
import config from '../../config.js';
import moment from 'moment';

export default {
    name: 'advancedstats',
    aliases: ['astats', 'mystats', 'profile'],
    category: 'utility',
    description: 'View your detailed bot statistics and achievements',
    usage: '.advancedstats [@user]',
    example: '.advancedstats',
    cooldown: 5,
    permissions: ['user'],
    premium: true,

    async execute({ sock, message, from, sender, user }) {
        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        const targetJid = mentioned && mentioned.length > 0 ? mentioned[0] : sender;
        const targetUser = await getUser(targetJid) || user || {
            name: 'Unknown',
            isPremium: false,
            xp: 0,
            economy: { balance: 0, bank: 0 },
            messageCount: 0,
            commandsUsed: 0,
            createdAt: new Date(),
            lastSeen: new Date(),
            warnings: 0,
            banned: false
        };

        const userId = targetJid.split('@')[0];
        const userName = targetUser.name || 'Unknown';
        const isPremium = targetUser.isPremium || false;
        const level = Math.floor((targetUser.xp || 0) / 1000) + 1;
        const xpProgress = ((targetUser.xp || 0) % 1000) / 10;
        const balance = targetUser.economy?.balance || 0;
        const bank = targetUser.economy?.bank || 0;
        const totalWealth = balance + bank;
        const messageCount = targetUser.messageCount || 0;
        const commandsUsed = targetUser.commandsUsed || 0;
        const joinDate = targetUser.createdAt ? moment(targetUser.createdAt).format('DD/MM/YYYY') : 'Unknown';
        const lastSeen = targetUser.lastSeen ? moment(targetUser.lastSeen).fromNow() : 'Never';
        const warnings = targetUser.warnings || 0;
        const isBanned = targetUser.banned || false;

        const premiumStatus = isPremium ? '⚡ PREMIUM ELITE' : '🌟 FREE USER';
        const premiumEmoji = isPremium ? '👑' : '🎯';
        const statusEmoji = isBanned ? '🚫' : '✅';

        const achievements = [];
        if (level >= 10) achievements.push('🏆 Level Master');
        if (totalWealth >= 10000) achievements.push('💎 Rich Warrior');
        if (messageCount >= 1000) achievements.push('💬 Chat Legend');
        if (commandsUsed >= 100) achievements.push('🤖 Bot Expert');
        if (isPremium) achievements.push('⚡ Premium Member');
        if (achievements.length === 0) achievements.push('🌱 Newcomer');

        const rankProgress = '█'.repeat(Math.floor(xpProgress / 10)) + '▒'.repeat(10 - Math.floor(xpProgress / 10));

        const statsText = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  ${premiumEmoji} 𝗔𝗗𝗩𝗔𝗡𝗖𝗘𝗗 𝗦𝗧𝗔𝗧𝗦 ${premiumEmoji}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭─⦿「 👤 USER PROFILE 」
│
│  📛 𝗡𝗮𝗺𝗲: ${userName}
│  🆔 𝗜𝗗: @${userId}
│  ${statusEmoji} 𝗦𝘁𝗮𝘁𝘂𝘀: ${isBanned ? 'BANNED' : 'ACTIVE'}
│  ⚡ 𝗧𝗶𝗲𝗿: ${premiumStatus}
│  📅 𝗝𝗼𝗶𝗻𝗲𝗱: ${joinDate}
│  👀 𝗟𝗮𝘀𝘁 𝗦𝗲𝗲𝗻: ${lastSeen}
│
╰────────⦿

╭─⦿「 📊 PROGRESSION 」
│
│  🏆 𝗟𝗲𝘃𝗲𝗹: ${level}
│  ⭐ 𝗫𝗣: ${targetUser.xp || 0} / ${level * 1000}
│  📈 𝗣𝗿𝗼𝗴𝗿𝗲𝘀𝘀: ${xpProgress.toFixed(1)}%
│  ╰ [${rankProgress}]
│
╰────────⦿

╭─⦿「 💰 ECONOMY 」
│
│  💵 𝗪𝗮𝗹𝗹𝗲𝘁: $${balance.toLocaleString()}
│  🏦 𝗕𝗮𝗻𝗸: $${bank.toLocaleString()}
│  💎 𝗧𝗼𝘁𝗮𝗹: $${totalWealth.toLocaleString()}
│  📊 𝗥𝗮𝗻𝗸: ${totalWealth >= 50000 ? 'Tycoon 👑' : totalWealth >= 10000 ? 'Wealthy 💎' : 'Growing 🌱'}
│
╰────────⦿

╭─⦿「 📈 ACTIVITY 」
│
│  💬 𝗠𝗲𝘀𝘀𝗮𝗴𝗲𝘀: ${messageCount.toLocaleString()}
│  🤖 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀: ${commandsUsed.toLocaleString()}
│  ⚠️ 𝗪𝗮𝗿𝗻𝗶𝗻𝗴𝘀: ${warnings}/3
│  🎯 𝗔𝗰𝘁𝗶𝘃𝗶𝘁𝘆: ${messageCount > 500 ? 'Very Active 🔥' : messageCount > 100 ? 'Active ⚡' : 'Starting 🌟'}
│
╰────────⦿

╭─⦿「 🏆 ACHIEVEMENTS 」
│
${achievements.map(ach => `│  ${ach}`).join('\n')}
│
╰────────⦿

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  💫 ${config.botName} Statistics
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        await sock.sendMessage(from, {
            text: statsText,
            mentions: [targetJid]
        }, { quoted: message });
    }
};
