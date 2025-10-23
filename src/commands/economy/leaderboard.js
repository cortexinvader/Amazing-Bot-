import config from '../../config.js';
import { User  } from '../../models/User.js';




export default {
    name: 'leaderboard',
    aliases: ['lb', 'top', 'rich'],
    category: 'economy',
    description: 'View economy leaderboards and rankings',
    usage: 'leaderboard [type] [page]',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            if (!config.economy.enabled) {
                return await sock.sendMessage(from, {
                    text: '❌ *Economy Disabled*\n\nThe economy system is currently disabled.'
                });
            }

            const type = args[0]?.toLowerCase() || 'balance';
            const page = Math.max(1, parseInt(args[1]) || 1);
            const limit = 10;
            const skip = (page - 1) * limit;

            const validTypes = ['balance', 'level', 'bank', 'total', 'commands'];
            if (!validTypes.includes(type)) {
                return await sock.sendMessage(from, {
                    text: `📊 *Economy Leaderboards*\n\n*Available types:*\n• balance - Richest users by cash\n• bank - Highest bank savings\n• total - Total money (cash + bank)\n• level - Highest experience levels\n• commands - Most commands used\n\n*Usage:* ${prefix}leaderboard [type] [page]\n*Examples:*\n• ${prefix}lb balance\n• ${prefix}lb level 2\n• ${prefix}top bank`
                });
            }

            await sock.sendMessage(from, {
                text: `📊 *Loading ${type} leaderboard...*\n\n🔍 Analyzing user data\n📈 Ranking top performers\n⏱️ Please wait...`
            });

            setTimeout(async () => {
                try {
                    let leaderboardUsers;
                    let leaderboardData;

                    if (type === 'total') {
                        leaderboardUsers = await User.aggregate([
                            { $match: { isBanned: false } },
                            {
                                $addFields: {
                                    totalWealth: { $add: ['$economy.balance', '$economy.bank'] }
                                }
                            },
                            { $sort: { totalWealth: -1 } },
                            { $skip: skip },
                            { $limit: limit }
                        ]);
                        
                        leaderboardData = leaderboardUsers.map(u => ({
                            name: u.name || u.phone || 'User',
                            balance: u.economy?.balance || 0,
                            bank: u.economy?.bank || 0,
                            total: (u.economy?.balance || 0) + (u.economy?.bank || 0),
                            level: u.economy?.level || 1,
                            commands: u.statistics?.commandsUsed || 0,
                            jid: u.jid
                        }));
                    } else {
                        let sortField;
                        switch (type) {
                            case 'balance':
                                sortField = 'economy.balance';
                                break;
                            case 'bank':
                                sortField = 'economy.bank';
                                break;
                            case 'level':
                                sortField = 'economy.level';
                                break;
                            case 'commands':
                                sortField = 'statistics.commandsUsed';
                                break;
                            default:
                                sortField = 'economy.balance';
                        }

                        leaderboardUsers = await User.getTopUsers(sortField, limit, skip);
                        
                        leaderboardData = leaderboardUsers.map(u => ({
                            name: u.name || u.phone || 'User',
                            balance: u.economy?.balance || 0,
                            bank: u.economy?.bank || 0,
                            level: u.economy?.level || 1,
                            commands: u.statistics?.commandsUsed || 0,
                            jid: u.jid
                        }));
                    }

                    const allUsers = await User.find({ isBanned: false }).select('jid economy.balance economy.bank economy.level statistics.commandsUsed');
                    const currentUserRank = allUsers.findIndex(u => u.jid === user.jid) + 1 || Math.floor(allUsers.length / 2);

                    let leaderboardText = `🏆 *${type.toUpperCase()} LEADERBOARD* - Page ${page}\n\n`;

                    leaderboardData.forEach((userData, index) => {
                        const rank = skip + index + 1;
                        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
                        
                        let value = '';
                        switch (type) {
                            case 'balance':
                                value = `${config.economy.currency.symbol}${userData.balance.toLocaleString()}`;
                                break;
                            case 'bank':
                                value = `${config.economy.currency.symbol}${userData.bank.toLocaleString()}`;
                                break;
                            case 'total':
                                value = `${config.economy.currency.symbol}${userData.total.toLocaleString()}`;
                                break;
                            case 'level':
                                value = `Level ${userData.level}`;
                                break;
                            case 'commands':
                                value = `${userData.commands} commands`;
                                break;
                        }
                        
                        leaderboardText += `${medal} ${userData.name}\n    💰 ${value}\n\n`;
                    });

                    leaderboardText += `📍 *Your Position:* #${currentUserRank}\n`;
                    leaderboardText += `💰 *Your ${type}:* `;
                    
                    switch (type) {
                        case 'balance':
                            leaderboardText += `${config.economy.currency.symbol}${user.economy.balance.toLocaleString()}`;
                            break;
                        case 'bank':
                            leaderboardText += `${config.economy.currency.symbol}${user.economy.bank.toLocaleString()}`;
                            break;
                        case 'total':
                            leaderboardText += `${config.economy.currency.symbol}${(user.economy.balance + user.economy.bank).toLocaleString()}`;
                            break;
                        case 'level':
                            leaderboardText += `Level ${user.economy.level}`;
                            break;
                        case 'commands':
                            leaderboardText += `${user.statistics?.commandsUsed || 0} commands`;
                            break;
                    }

                    leaderboardText += `\n\n📊 *Navigation:*\n`;
                    leaderboardText += `• ${prefix}lb ${type} ${page + 1} - Next page\n`;
                    if (page > 1) leaderboardText += `• ${prefix}lb ${type} ${page - 1} - Previous page\n`;
                    leaderboardText += `• ${prefix}lb [type] - Different leaderboard\n\n`;
                    
                    leaderboardText += `💡 *Climb the ranks:*\n`;
                    leaderboardText += `• ${prefix}work - Earn money\n`;
                    leaderboardText += `• ${prefix}daily - Daily rewards\n`;
                    leaderboardText += `• ${prefix}gamble - Risk for rewards\n`;
                    leaderboardText += `• ${prefix}shop - Invest in items`;

                    await sock.sendMessage(from, { text: leaderboardText });

                } catch (error) {
                    await sock.sendMessage(from, {
                        text: '❌ *Leaderboard Error*\n\nFailed to load leaderboard data.'
                    });
                }
            }, 2000);

        } catch (error) {
            console.error('Leaderboard command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to load leaderboard.'
            });
        }
    }
};