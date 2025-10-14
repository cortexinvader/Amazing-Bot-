import config from '../../config.js';
import { updateUser } from '../../models/User.js';

export default {
    name: 'daily',
    aliases: ['claim', 'reward'],
    category: 'economy',
    description: 'Claim your daily reward',
    usage: 'daily',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            if (!config.economy.enabled) {
                return await sock.sendMessage(from, {
                    text: '❌ *Economy Disabled*\n\nThe economy system is currently disabled.'
                }, { quoted: message });
            }

            const now = new Date();
            const lastDaily = user.economy.lastDaily;
            const dailyCooldown = 24 * 60 * 60 * 1000; // 24 hours

            // Check daily cooldown
            if (lastDaily) {
                const timeSinceLastDaily = now.getTime() - lastDaily.getTime();

                if (timeSinceLastDaily < dailyCooldown) {
                    const timeLeft = dailyCooldown - timeSinceLastDaily;
                    const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
                    const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

                    return await sock.sendMessage(from, {
                        text: `⏰ *Daily Reward Cooldown*\n\n🕐 *Available in:* ${hoursLeft}h ${minutesLeft}m\n⚡ *Last claimed:* ${lastDaily.toLocaleDateString()}\n\n💡 *While waiting:*\n• ${prefix}work - Earn money\n• ${prefix}gamble - Try your luck\n• ${prefix}shop - Spend your earnings`
                    }, { quoted: message });
                }
            }

            // Daily rewards
            const baseReward = Math.floor(Math.random() * 500) + 500; // 500-1000
            const streakBonus = Math.min(user.economy.dailyStreak || 0, 7) * 50; // Up to 350 bonus
            const premiumMultiplier = user.isPremium ? 1.5 : 1;
            const levelBonus = Math.floor(user.economy.level * 10);

            let totalReward = Math.floor((baseReward + streakBonus + levelBonus) * premiumMultiplier);

            // Update user data
            await updateUser(user.jid, {
                $inc: {
                    'economy.balance': totalReward,
                    'economy.dailyStreak': 1
                },
                $set: {
                    'economy.lastDaily': now
                },
                $push: {
                    'economy.transactions': {
                        type: 'daily',
                        amount: totalReward,
                        description: 'Daily reward claim',
                        timestamp: now
                    }
                }
            });

            const newStreak = (user.economy.dailyStreak || 0) + 1;
            const newBalance = user.economy.balance + totalReward;

            const rewardText = `🎉 *Daily Reward Claimed!*\n\n` +
                `💰 *Base reward:* ${config.economy.currency.symbol}${baseReward.toLocaleString()}\n` +
                `🔥 *Streak bonus:* ${config.economy.currency.symbol}${streakBonus.toLocaleString()} (${newStreak} days)\n` +
                `⬆️ *Level bonus:* ${config.economy.currency.symbol}${levelBonus.toLocaleString()}\n` +
                `${premiumMultiplier > 1 ? `👑 *Premium bonus:* x${premiumMultiplier}\n` : ''}` +
                `\n💵 *Total received:* ${config.economy.currency.symbol}${totalReward.toLocaleString()}\n` +
                `🏦 *New balance:* ${config.economy.currency.symbol}${newBalance.toLocaleString()}\n\n` +
                `📅 *Next reward:* 24 hours\n` +
                `🔥 *Current streak:* ${newStreak} days\n\n` +
                `💡 *Tips:*\n• Keep your streak alive!\n• Premium users get 50% more\n• Higher levels = bigger bonuses`;

            await sock.sendMessage(from, { text: rewardText }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to claim daily reward. Please try again.'
            }, { quoted: message });
        }
    }
};