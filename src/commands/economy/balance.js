import config from '../../config.js';
import { getUser } from '../../models/User.js';

export default {
    name: 'balance',
    aliases: ['bal', 'money', 'coins'],
    category: 'economy',
    description: 'Check your current balance',
    usage: 'balance [@user]',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
            
            let targetUser = user;
            let targetJid = user.jid;
            
            if (quotedUser) {
                targetUser = await getUser(quotedUser);
                targetJid = quotedUser;
            } else if (mentionedUsers.length > 0) {
                targetUser = await getUser(mentionedUsers[0]);
                targetJid = mentionedUsers[0];
            }

            if (!targetUser) {
                targetUser = user;
                targetJid = user.jid;
            }

            if (!targetUser.economy) {
                targetUser.economy = {
                    balance: 1000,
                    bank: 0,
                    level: 1,
                    xp: 0,
                    rank: 'Beginner',
                    dailyStreak: 0,
                    lastDaily: null,
                    lastWeekly: null,
                    lastWork: null
                };
            }

            const balance = targetUser.economy.balance || 0;
            const bank = targetUser.economy.bank || 0;
            const total = balance + bank;
            const level = targetUser.economy.level || 1;
            const xp = targetUser.economy.xp || 0;
            const rank = targetUser.economy.rank || 'Beginner';

            const dailyStatus = targetUser.economy.lastDaily && 
                (Date.now() - new Date(targetUser.economy.lastDaily).getTime()) < (24 * 60 * 60 * 1000) ? 'Claimed ✅' : 'Available ❌';
            
            const weeklyStatus = targetUser.economy.lastWeekly && 
                (Date.now() - new Date(targetUser.economy.lastWeekly).getTime()) < (7 * 24 * 60 * 60 * 1000) ? 'Claimed ✅' : 'Available ❌';

            const workStatus = targetUser.economy.lastWork ? 
                (() => {
                    const timeSinceWork = Date.now() - new Date(targetUser.economy.lastWork).getTime();
                    const hours = Math.floor(timeSinceWork / (60 * 60 * 1000));
                    return hours > 0 ? `${hours}h ago` : 'Available ❌';
                })() : 'Available ❌';

            const targetNumber = targetJid.split('@')[0];
            const isOwnBalance = targetJid === user.jid;

            const balanceText = `╭──⦿【 💰 ${isOwnBalance ? 'YOUR' : 'USER'} BALANCE 】
╰────────⦿

${!isOwnBalance ? `╭──⦿【 👤 USER INFO 】
│ 📱 𝗣𝗵𝗼𝗻𝗲: @${targetNumber}
│ 👤 𝗡𝗮𝗺𝗲: ${targetUser.name || 'User'}
╰────────⦿

` : ''}╭──⦿【 💵 WALLET 】
│ 💵 𝗖𝗮𝘀𝗵: $${balance.toLocaleString()}
│ 🏦 𝗕𝗮𝗻𝗸: $${bank.toLocaleString()}
│ 💎 𝗧𝗼𝘁𝗮𝗹: $${total.toLocaleString()}
╰────────⦿

╭──⦿【 📊 STATS 】
│ ⭐ 𝗟𝗲𝘃𝗲𝗹: ${level}
│ ✨ 𝗫𝗣: ${xp}/100
│ 🏅 𝗥𝗮𝗻𝗸: ${rank}
╰────────⦿

${isOwnBalance ? `╭──⦿【 🕐 COOLDOWNS 】
│ ✅ 𝗗𝗮𝗶𝗹𝘆: ${dailyStatus}
│ ✅ 𝗪𝗲𝗲𝗸𝗹𝘆: ${weeklyStatus}
│ ⏰ 𝗪𝗼𝗿𝗸: ${workStatus}
╰────────⦿

╭──⦿【 💡 EARN MORE 】
│ ✧ ${prefix}daily - Daily bonus
│ ✧ ${prefix}work - Earn cash
│ ✧ ${prefix}gamble - Risk it
│ ✧ ${prefix}shop - Buy items
╰────────⦿` : ''}`;

            const mentions = !isOwnBalance ? [targetJid] : [];

            await sock.sendMessage(from, { 
                text: balanceText,
                mentions: mentions
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to fetch balance information.'
            }, { quoted: message });
        }
    }
};