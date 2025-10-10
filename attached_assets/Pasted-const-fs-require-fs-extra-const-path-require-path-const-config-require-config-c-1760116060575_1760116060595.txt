const fs = require('fs-extra');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const User = require('../models/user');
const axios = require('axios');

let commands = new Map();
const cooldowns = new Map();
const aliases = new Map();

const loadCommands = async (directory) => {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            await loadCommands(fullPath);
            continue;
        }
        if (!entry.name.endsWith('.js')) continue;
        try {
            const command = require(fullPath);
            if (command.name && command.execute) {
                command.category = path.basename(path.dirname(fullPath));
                commands.set(command.name, command);
                if (command.aliases) {
                    command.aliases.forEach(alias => aliases.set(alias, command.name));
                }
            }
        } catch (error) {
            logger.error(`Failed to load command ${entry.name}:`, error);
        }
    }
};

const initializeCommands = async () => {
    const commandsDir = path.join(__dirname, '..', 'commands');
    await loadCommands(commandsDir);
    logger.info(`Loaded ${commands.size} commands and ${aliases.size} aliases`);
};

const isGroupAdmin = async (sock, groupId, participant) => {
    try {
        const groupMetadata = await sock.groupMetadata(groupId);
        const groupAdmins = groupMetadata.participants
            .filter(p => p.admin)
            .map(p => p.id);
        return groupAdmins.includes(participant);
    } catch {
        return false;
    }
};

const isOwner = (participant) => {
    return config.bot.ownerNumber.includes(participant);
};

const handleCooldown = async (sock, message, command) => {
    if (!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Map());
    }
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || config.limits.cooldown) * 1000;
    const userId = message.key.participant || message.key.remoteJid;
    
    if (timestamps.has(userId)) {
        const expirationTime = timestamps.get(userId) + cooldownAmount;
        if (Date.now() < expirationTime) {
            const timeLeft = (expirationTime - Date.now()) / 1000;
            await sock.sendMessage(message.key.remoteJid, { 
                text: `⏳ Please wait ${timeLeft.toFixed(1)} seconds before using ${command.name} again.`,
                }, { quoted: message });
            return false;
        }
    }
    
    timestamps.set(userId, Date.now());
    setTimeout(() => timestamps.delete(userId), cooldownAmount);
    return true;
};

const executeCommand = async (sock, message, command, args) => {
    const resolvedCommand = commands.get(command) || commands.get(aliases.get(command));
    if (!resolvedCommand) {
        await sock.sendMessage(message.key.remoteJid, {
            text: `❌ Command *${command}* does not exist in NexusCoders Bot.\nType *${config.bot.prefix}menu* to see available commands.`,
            }, { quoted: message });
        return;
    }

    const participant = message.key.participant || message.key.remoteJid;
    const isGroupMsg = message.key.remoteJid.endsWith('@g.us');

    if (config.bot.publicMode && !config.bot.privateMode) {
    } else if (!config.bot.publicMode && config.bot.privateMode && !isOwner(participant)) {
        await sock.sendMessage(message.key.remoteJid, { 
            text: '🔒 This bot is currently in private mode. Only the owner can use it.',
            }, { quoted: message });
        return;
    }

    if (config.bot.selfBot && !isOwner(participant)) return;

    const user = await User.findOne({ jid: participant }) || 
                await User.create({ 
                    jid: participant, 
                    name: message.pushName || participant.split('@')[0] 
                });

    if (user.isBanned && !isOwner(participant)) {
        await sock.sendMessage(message.key.remoteJid, { 
            text: config.messages.autoResponse.banned,
            quoted: message 
        });
        return;
    }

    const checks = [
        { condition: resolvedCommand.ownerOnly && !isOwner(participant), message: config.messages.commands.ownerOnly },
        { condition: resolvedCommand.groupOnly && !isGroupMsg, message: config.messages.commands.groupOnly },
        { condition: resolvedCommand.privateOnly && isGroupMsg, message: config.messages.commands.privateOnly },
        { condition: resolvedCommand.adminOnly && !await isGroupAdmin(sock, message.key.remoteJid, participant) && !isOwner(participant), 
          message: config.messages.commands.adminOnly }
    ];

    for (const check of checks) {
        if (check.condition) {
            await sock.sendMessage(message.key.remoteJid, { 
                text: check.message,
                quoted: message 
            });
            return;
        }
    }

    if (resolvedCommand.botAdminRequired && isGroupMsg) {
        const isBotAdmin = await isGroupAdmin(sock, message.key.remoteJid, sock.user.id);
        if (!isBotAdmin) {
            await sock.sendMessage(message.key.remoteJid, { 
                text: config.messages.commands.botAdminRequired,
                }, { quoted: message });
            return;
        }
    }

    if (!await handleCooldown(sock, message, resolvedCommand)) return;

    try {
        await resolvedCommand.execute(sock, message, args, user);
        
        if (config.features.leveling.enabled) {
            const xpGained = config.features.leveling.commandXP;
            const didLevelUp = await user.addExperience(xpGained);
            if (didLevelUp) {
                await sock.sendMessage(message.key.remoteJid, { 
                    text: `🎉 Congratulations! You've reached level ${user.level}!`,
                    }, { quoted: message });
            }
        }

        await User.updateOne(
            { jid: participant },
            { 
                $inc: { 'statistics.commandsUsed': 1 }, 
                lastCommandTime: new Date() 
            }
        );
    } catch (error) {
        logger.error(`Command execution error (${command}):`, error);
        await sock.sendMessage(message.key.remoteJid, { 
            text: config.messages.commands.error,
            }, { quoted: message });
    }
};

const onReply = async (sock, message, chatId, userId) => {
    const user = await User.findOne({ jid: userId });
    if (!user?.replyCommandName) return;

    const command = commands.get(user.replyCommandName);
    if (command?.onReply) {
        try {
            await command.onReply(sock, message, user);
        } catch (error) {
            logger.error(`Reply handler error (${user.replyCommandName}):`, error);
            user.replyCommandName = null;
            user.replyData = null;
            await user.save();
        }
    }
};

const onChat = async (sock, message, chatId, userId) => {
    const user = await User.findOne({ jid: userId });
    if (!user?.chatCommandName) return;

    const command = commands.get(user.chatCommandName);
    if (command?.onChat) {
        try {
            await command.onChat(sock, message, user);
        } catch (error) {
            logger.error(`Chat handler error (${user.chatCommandName}):`, error);
            user.chatCommandName = null;
            user.chatData = null;
            await user.save();
        }
    }
};

module.exports = {
    initializeCommands,
    executeCommand,
    getCommands: () => Array.from(commands.values()),
    onReply,
    onChat
};
