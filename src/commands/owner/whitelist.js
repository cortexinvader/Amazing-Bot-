import fs from 'fs-extra';
import path from 'path';
import logger from '../../utils/logger.js';

const whitelistPath = path.join(process.cwd(), 'cache', 'whitelist.json');

const initWhitelist = () => {
    try {
        // Ensure cache directory exists
        fs.ensureDirSync(path.dirname(whitelistPath));
        
        // If file doesn't exist, create it with disabled state
        if (!fs.existsSync(whitelistPath)) {
            const defaultData = {
                enabled: false, // Default to DISABLED for safety
                users: [],
                groups: []
            };
            fs.writeJsonSync(whitelistPath, defaultData, { spaces: 2 });
            logger.info('Created new whitelist file (disabled by default)');
            return defaultData;
        }
        
        // Read existing file
        const data = fs.readJsonSync(whitelistPath);
        
        // Validate structure
        if (typeof data !== 'object' || data === null) {
            logger.warn('Invalid whitelist data, resetting to default');
            const defaultData = { enabled: false, users: [], groups: [] };
            fs.writeJsonSync(whitelistPath, defaultData, { spaces: 2 });
            return defaultData;
        }
        
        // Ensure required fields exist
        if (typeof data.enabled !== 'boolean') {
            data.enabled = false;
        }
        if (!Array.isArray(data.users)) {
            data.users = [];
        }
        if (!Array.isArray(data.groups)) {
            data.groups = [];
        }
        
        logger.debug(`Whitelist loaded: enabled=${data.enabled}, users=${data.users.length}, groups=${data.groups.length}`);
        return data;
    } catch (error) {
        logger.error('Error initializing whitelist:', error);
        // Return safe default on error
        return { enabled: false, users: [], groups: [] };
    }
};

const saveWhitelist = (data) => {
    try {
        // Validate data before saving
        if (!data || typeof data !== 'object') {
            logger.error('Invalid whitelist data to save');
            return false;
        }
        
        // Ensure required fields
        if (typeof data.enabled !== 'boolean') {
            data.enabled = false;
        }
        if (!Array.isArray(data.users)) {
            data.users = [];
        }
        if (!Array.isArray(data.groups)) {
            data.groups = [];
        }
        
        fs.ensureDirSync(path.dirname(whitelistPath));
        fs.writeJsonSync(whitelistPath, data, { spaces: 2 });
        logger.debug(`Whitelist saved: enabled=${data.enabled}, users=${data.users.length}`);
        return true;
    } catch (error) {
        logger.error('Error saving whitelist:', error);
        return false;
    }
};

const isWhitelisted = (jid, data) => {
    try {
        if (!jid || !data || !Array.isArray(data.users)) {
            return false;
        }
        
        // Normalize JID for comparison
        const normalizedJid = jid.split('@')[0].replace(/:\d+$/, '') + '@s.whatsapp.net';
        
        // Check if user is in whitelist
        const result = data.users.some(whitelistedJid => {
            const normalizedWhitelisted = whitelistedJid.split('@')[0].replace(/:\d+$/, '') + '@s.whatsapp.net';
            return normalizedJid === normalizedWhitelisted;
        });
        
        logger.debug(`Whitelist check for ${jid.split('@')[0]}: ${result}`);
        return result;
    } catch (error) {
        logger.error('Error checking whitelist:', error);
        return false;
    }
};

const isOwner = (jid, config) => {
    try {
        if (!jid || !config || !config.ownerNumbers) {
            logger.debug('Invalid parameters for owner check');
            return false;
        }
        
        // Extract phone number from JID
        const number = jid.split('@')[0].replace(/:\d+$/, '');
        
        // Check against all owner numbers
        const result = config.ownerNumbers.some(ownerJid => {
            const ownerNumber = ownerJid.split('@')[0].replace(/:\d+$/, '');
            const match = number === ownerNumber;
            if (match) {
                logger.debug(`Owner match: ${number} === ${ownerNumber}`);
            }
            return match;
        });
        
        logger.debug(`Owner check for ${number}: ${result}`);
        return result;
    } catch (error) {
        logger.error('Error checking owner status:', error);
        return false;
    }
};

const isSudo = (jid, config) => {
    try {
        // Owners are automatically sudo
        if (isOwner(jid, config)) {
            logger.debug(`User ${jid.split('@')[0]} is owner, therefore sudo`);
            return true;
        }
        
        if (!jid || !config || !config.sudoers) {
            return false;
        }
        
        // Extract phone number from JID
        const number = jid.split('@')[0].replace(/:\d+$/, '');
        
        // Check against sudo list
        const result = config.sudoers.some(sudoJid => {
            const sudoNumber = sudoJid.split('@')[0].replace(/:\d+$/, '');
            const match = number === sudoNumber;
            if (match) {
                logger.debug(`Sudo match: ${number} === ${sudoNumber}`);
            }
            return match;
        });
        
        logger.debug(`Sudo check for ${number}: ${result}`);
        return result;
    } catch (error) {
        logger.error('Error checking sudo status:', error);
        return false;
    }
};

export default {
    name: 'whitelist',
    aliases: ['wl', 'whitelist-mode', 'exclusive'],
    category: 'owner',
    description: '🔐 Advanced Whitelist System - Control who can use the bot. When enabled, only owner, sudo, and whitelisted users can interact.',
    usage: 'whitelist <action> [user]',
    example: `whitelist enable
whitelist disable
whitelist add (reply to user)
whitelist remove @user
whitelist list
whitelist status
whitelist clear`,
    cooldown: 2,
    permissions: ['owner'],
    args: true,
    minArgs: 1,
    maxArgs: 5,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: true,

    async execute({ sock, message, args, from, sender, isGroup, prefix }) {
        const action = args[0].toLowerCase();
        let whitelistData = initWhitelist();
        const config = await import('../../config.js').then(m => m.default);

        try {
            switch (action) {
                case 'enable':
                case 'on':
                case 'activate': {
                    if (whitelistData.enabled) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ℹ️ ALREADY ENABLED ⦿─────\n│\n│ 🔐 Whitelist mode is already active\n│\n│ 👥 Whitelisted: ${whitelistData.users.length} users\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    whitelistData.enabled = true;
                    saveWhitelist(whitelistData);
                    
                    logger.info(`Whitelist mode ENABLED by ${sender.split('@')[0]}`);

                    await sock.sendMessage(from, {
                        text: `╭─────⦿ ✅ WHITELIST ENABLED ⦿─────\n│\n│ 🔐 *Whitelist mode activated!*\n│\n│ 📋 *How it works:*\n│ • Owner and sudo can always use bot\n│ • Reply to users to whitelist them\n│ • Whitelisted users get full access\n│\n│ 📝 *Commands:*\n│ ${prefix}whitelist add (reply to user)\n│ ${prefix}whitelist remove @user\n│ ${prefix}whitelist list\n│\n│ 👥 Currently whitelisted: ${whitelistData.users.length}\n│\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`
                    }, { quoted: message });
                    
                    break;
                }

                case 'disable':
                case 'off':
                case 'deactivate': {
                    if (!whitelistData.enabled) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ℹ️ ALREADY DISABLED ⦿─────\n│\n│ 🔓 Whitelist mode is not active\n│ Everyone can use the bot\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    whitelistData.enabled = false;
                    saveWhitelist(whitelistData);
                    
                    logger.info(`Whitelist mode DISABLED by ${sender.split('@')[0]}`);

                    await sock.sendMessage(from, {
                        text: `╭─────⦿ 🔓 WHITELIST DISABLED ⦿─────\n│\n│ ✅ *Whitelist mode deactivated!*\n│\n│ 🌐 Bot is now public\n│ 👥 Everyone can use commands\n│\n│ 📝 Whitelist data preserved:\n│ ${whitelistData.users.length} users still saved\n│\n│ 💡 Enable anytime with:\n│ ${prefix}whitelist enable\n│\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`
                    }, { quoted: message });
                    
                    break;
                }

                case 'add':
                case 'allow':
                case 'permit':
                case '+': {
                    let targetJid = null;
                    let targetName = 'User';

                    const quotedMsg = message.message?.extendedTextMessage?.contextInfo;
                    if (quotedMsg && quotedMsg.participant) {
                        targetJid = quotedMsg.participant;
                        targetName = quotedMsg.pushName || 'User';
                    } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
                        targetJid = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
                    } else if (args[1]) {
                        const number = args[1].replace(/[^0-9]/g, '');
                        if (number) {
                            targetJid = number + '@s.whatsapp.net';
                        }
                    }

                    if (!targetJid) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ 💡 ADD USER GUIDE ⦿─────\n│\n│ *How to whitelist a user:*\n│\n│ 1. Reply to their message with:\n│    ${prefix}whitelist add\n│\n│ 2. Or mention them:\n│    ${prefix}whitelist add @user\n│\n│ 3. Or use phone number:\n│    ${prefix}whitelist add 1234567890\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    // Normalize the JID before checking
                    const normalizedJid = targetJid.split('@')[0].replace(/:\d+$/, '') + '@s.whatsapp.net';

                    if (whitelistData.users.some(jid => {
                        const normalized = jid.split('@')[0].replace(/:\d+$/, '') + '@s.whatsapp.net';
                        return normalized === normalizedJid;
                    })) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ℹ️ ALREADY WHITELISTED ⦿─────\n│\n│ 👤 *${targetName}*\n│ 📞 ${targetJid.split('@')[0]}\n│\n│ ✅ Already has whitelist access\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    whitelistData.users.push(normalizedJid);
                    saveWhitelist(whitelistData);
                    
                    logger.info(`User ${targetJid.split('@')[0]} whitelisted by ${sender.split('@')[0]}`);

                    await sock.sendMessage(from, {
                        text: `╭─────⦿ ✅ USER WHITELISTED ⦿─────\n│\n│ 👤 *Name:* ${targetName}\n│ 📞 *Number:* ${targetJid.split('@')[0]}\n│\n│ ✨ User can now use the bot\n│ 👥 Total whitelisted: ${whitelistData.users.length}\n│\n│ 🔐 Whitelist: ${whitelistData.enabled ? 'ACTIVE' : 'INACTIVE'}\n│\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`
                    }, { quoted: message });

                    if (isGroup && targetJid !== sender) {
                        try {
                            await sock.sendMessage(from, {
                                text: `🎉 *Congratulations @${targetJid.split('@')[0]}!*\n\nYou have been whitelisted by the bot owner.\nYou can now use all bot commands! 🚀`,
                                mentions: [targetJid]
                            });
                        } catch (error) {
                            logger.error('Failed to notify whitelisted user:', error);
                        }
                    }
                    break;
                }

                case 'remove':
                case 'delete':
                case 'revoke':
                case '-': {
                    let targetJid = null;
                    let targetName = 'User';

                    const quotedMsg = message.message?.extendedTextMessage?.contextInfo;
                    if (quotedMsg && quotedMsg.participant) {
                        targetJid = quotedMsg.participant;
                        targetName = quotedMsg.pushName || 'User';
                    } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
                        targetJid = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
                    } else if (args[1]) {
                        const number = args[1].replace(/[^0-9]/g, '');
                        if (number) {
                            targetJid = number + '@s.whatsapp.net';
                        }
                    }

                    if (!targetJid) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ 💡 REMOVE USER GUIDE ⦿─────\n│\n│ *How to remove from whitelist:*\n│\n│ 1. Reply to their message with:\n│    ${prefix}whitelist remove\n│\n│ 2. Or mention them:\n│    ${prefix}whitelist remove @user\n│\n│ 3. Or use phone number:\n│    ${prefix}whitelist remove 1234567890\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    // Normalize the JID for comparison
                    const normalizedTarget = targetJid.split('@')[0].replace(/:\d+$/, '') + '@s.whatsapp.net';
                    const index = whitelistData.users.findIndex(jid => {
                        const normalized = jid.split('@')[0].replace(/:\d+$/, '') + '@s.whatsapp.net';
                        return normalized === normalizedTarget;
                    });

                    if (index === -1) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ℹ️ NOT WHITELISTED ⦿─────\n│\n│ 👤 *${targetName}*\n│ 📞 ${targetJid.split('@')[0]}\n│\n│ ❌ User is not in whitelist\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    whitelistData.users.splice(index, 1);
                    saveWhitelist(whitelistData);
                    
                    logger.info(`User ${targetJid.split('@')[0]} removed from whitelist by ${sender.split('@')[0]}`);

                    await sock.sendMessage(from, {
                        text: `╭─────⦿ 🗑️ USER REMOVED ⦿─────\n│\n│ 👤 *Name:* ${targetName}\n│ 📞 *Number:* ${targetJid.split('@')[0]}\n│\n│ ❌ Removed from whitelist\n│ 👥 Total whitelisted: ${whitelistData.users.length}\n│\n│ 🔐 Whitelist: ${whitelistData.enabled ? 'ACTIVE' : 'INACTIVE'}\n│\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`
                    }, { quoted: message });
                    
                    break;
                }

                case 'list':
                case 'show':
                case 'users':
                case 'all': {
                    if (whitelistData.users.length === 0) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ 📋 WHITELIST EMPTY ⦿─────\n│\n│ ❌ No users whitelisted\n│\n│ 🔐 Mode: ${whitelistData.enabled ? 'ACTIVE ✅' : 'INACTIVE ❌'}\n│\n│ 💡 Add users with:\n│ ${prefix}whitelist add (reply to user)\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    let listText = `╭─────⦿ 📋 WHITELIST USERS ⦿─────\n│\n│ 🔐 *Mode:* ${whitelistData.enabled ? 'ACTIVE ✅' : 'INACTIVE ❌'}\n│ 👥 *Total:* ${whitelistData.users.length} users\n│\n`;

                    whitelistData.users.forEach((jid, index) => {
                        const number = jid.split('@')[0];
                        listText += `│ ${index + 1}. @${number}\n`;
                    });

                    listText += `│\n│ 💡 *Commands:*\n│ ${prefix}whitelist remove @user\n│ ${prefix}whitelist clear\n│\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`;

                    await sock.sendMessage(from, {
                        text: listText,
                        mentions: whitelistData.users
                    }, { quoted: message });
                    break;
                }

                case 'clear':
                case 'reset':
                case 'removeall': {
                    if (whitelistData.users.length === 0) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ℹ️ ALREADY EMPTY ⦿─────\n│\n│ ❌ No users to clear\n│ Whitelist is already empty\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    const count = whitelistData.users.length;
                    whitelistData.users = [];
                    saveWhitelist(whitelistData);
                    
                    logger.info(`Whitelist cleared by ${sender.split('@')[0]}, removed ${count} users`);

                    await sock.sendMessage(from, {
                        text: `╭─────⦿ 🗑️ WHITELIST CLEARED ⦿─────\n│\n│ ✅ *Successfully cleared!*\n│\n│ 📊 Removed: ${count} users\n│ 👥 Current: 0 users\n│\n│ 🔐 Mode: ${whitelistData.enabled ? 'STILL ACTIVE' : 'INACTIVE'}\n│\n│ ${whitelistData.enabled ? '⚠️ Whitelist mode still active!\n│ Only owner/sudo can use bot now.\n│' : ''}\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`
                    }, { quoted: message });
                    
                    break;
                }

                case 'status':
                case 'info':
                case 'check': {
                    const statusEmoji = whitelistData.enabled ? '🔐' : '🔓';
                    const statusText = whitelistData.enabled ? 'ACTIVE' : 'INACTIVE';
                    const accessText = whitelistData.enabled ? 'RESTRICTED' : 'PUBLIC';

                    await sock.sendMessage(from, {
                        text: `╭─────⦿ ${statusEmoji} WHITELIST STATUS ⦿─────\n│\n│ 🔐 *Mode:* ${statusText}\n│ 🌐 *Access:* ${accessText}\n│ 👥 *Whitelisted:* ${whitelistData.users.length} users\n│\n│ ${whitelistData.enabled ? '✅ Only owner, sudo, and whitelisted\n│    users can use the bot' : '🌍 Everyone can use the bot'}\n│\n│ *COMMANDS:*\n│ ${prefix}whitelist ${whitelistData.enabled ? 'disable' : 'enable'}\n│ ${prefix}whitelist add (reply to user)\n│ ${prefix}whitelist list\n│ ${prefix}whitelist remove @user\n│ ${prefix}whitelist clear\n│\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`
                    }, { quoted: message });
                    break;
                }

                default: {
                    await sock.sendMessage(from, {
                        text: `╭─────⦿ 🔐 WHITELIST SYSTEM ⦿─────\n│\n│ *CONTROL COMMANDS:*\n│ ${prefix}whitelist enable\n│    🔒 Activate whitelist mode\n│\n│ ${prefix}whitelist disable\n│    🔓 Deactivate whitelist mode\n│\n│ *USER MANAGEMENT:*\n│ ${prefix}whitelist add (reply)\n│    ➕ Add user to whitelist\n│\n│ ${prefix}whitelist remove (reply)\n│    ➖ Remove user from whitelist\n│\n│ ${prefix}whitelist list\n│    📋 Show all whitelisted users\n│\n│ ${prefix}whitelist clear\n│    🗑️ Remove all users\n│\n│ *INFORMATION:*\n│ ${prefix}whitelist status\n│    ℹ️ Show current status\n│\n│ *CURRENT STATUS:*\n│ 🔐 Mode: ${whitelistData.enabled ? 'ACTIVE ✅' : 'INACTIVE ❌'}\n│ 👥 Users: ${whitelistData.users.length} whitelisted\n│\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`
                    }, { quoted: message });
                }
            }
        } catch (error) {
            logger.error('Whitelist command error:', error);
            await sock.sendMessage(from, {
                text: `╭─────⦿ ❌ ERROR ⦿─────\n│\n│ ⚠️ *Error:* ${error.message}\n│\n│ 📝 Check logs for details\n│\n╰──────────────────────⦿`
            }, { quoted: message });
        }
    }
};

export { initWhitelist, isWhitelisted, isOwner, isSudo };