import config from '../config.js';
import logger from '../utils/logger.js';
import { 
    commandManager,
    getCommand,
    getAllCommands,
    getCommandsByCategory,
    searchCommands as searchCommandsUtil,
    getSystemStats,
    recordCommandUsage,
    getAllCategories
} from '../utils/commandManager.js';

class CommandHandler {
    constructor() {
        this.cooldowns = new Map();
        this.userCooldowns = new Map();
        this.commandExecutions = new Map();
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            await commandManager.initializeCommands();
            this.isInitialized = true;
            logger.info(`✅ Command handler initialized successfully with ${getAllCommands().length} commands`);
            return true;
        } catch (error) {
            logger.error('❌ Command handler initialization failed:', error);
            return false;
        }
    }

    async loadCommands() {
        return await this.initialize();
    }

    getCommand(commandName) {
        return getCommand(commandName);
    }

    getAllCommands() {
        return getAllCommands();
    }

    getCommandsByCategory(category) {
        return getCommandsByCategory(category);
    }

    getAllCategories() {
        return getAllCategories();
    }

    searchCommands(query) {
        return searchCommandsUtil(query);
    }

    getCommandCount() {
        return getAllCommands().length;
    }

    getCommandStats() {
        return getSystemStats();
    }

    isOwner(sender) {
        if (!sender) return false;
        const senderNumber = sender.split('@')[0].replace(/:\d+$/, '');
        
        if (config.ownerNumbers && Array.isArray(config.ownerNumbers)) {
            return config.ownerNumbers.some(ownerJid => {
                const ownerNumber = ownerJid.split('@')[0].replace(/:\d+$/, '');
                return senderNumber === ownerNumber;
            });
        }
        
        return false;
    }

    isSudo(sender) {
        if (!sender) return false;
        if (this.isOwner(sender)) return true;
        
        const sudoNumber = sender.split('@')[0].replace(/:\d+$/, '');
        
        if (config.sudoers && Array.isArray(config.sudoers)) {
            return config.sudoers.some(sudoJid => {
                const sudoNum = sudoJid.split('@')[0].replace(/:\d+$/, '');
                return sudoNumber === sudoNum;
            });
        }
        
        return false;
    }

    async checkCooldown(commandName, sender) {
        const command = this.getCommand(commandName);
        if (!command || !command.cooldown) return { onCooldown: false };

        if (this.isOwner(sender)) return { onCooldown: false };

        const cooldownKey = `${commandName}_${sender}`;
        const now = Date.now();
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (this.cooldowns.has(cooldownKey)) {
            const expirationTime = this.cooldowns.get(cooldownKey) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return {
                    onCooldown: true,
                    timeLeft: timeLeft.toFixed(1)
                };
            }
        }

        this.cooldowns.set(cooldownKey, now);
        setTimeout(() => this.cooldowns.delete(cooldownKey), cooldownAmount);

        return { onCooldown: false };
    }

    async checkPermissions(command, sock, message, isGroup, isGroupAdmin, isBotAdmin) {
        const from = message.key.remoteJid;
        const sender = message.key.participant || from;

        if (command.ownerOnly && !this.isOwner(sender)) {
            await sock.sendMessage(from, {
                text: '❌ *Access Denied*\n\nThis command is only available to the bot owner.'
            }, { quoted: message });
            return false;
        }

        if (command.sudoOnly && !this.isSudo(sender)) {
            await sock.sendMessage(from, {
                text: '❌ *Access Denied*\n\nThis command is only available to sudo users.'
            }, { quoted: message });
            return false;
        }

        if (command.groupOnly && !isGroup) {
            await sock.sendMessage(from, {
                text: '❌ *Group Only*\n\nThis command can only be used in groups.'
            }, { quoted: message });
            return false;
        }

        if (command.privateOnly && isGroup) {
            await sock.sendMessage(from, {
                text: '❌ *Private Only*\n\nThis command can only be used in private chat.'
            }, { quoted: message });
            return false;
        }

        if (isGroup && command.adminOnly && !isGroupAdmin && !this.isOwner(sender)) {
            await sock.sendMessage(from, {
                text: '❌ *Admin Only*\n\nThis command requires group admin privileges.'
            }, { quoted: message });
            return false;
        }

        if (isGroup && command.botAdminRequired && !isBotAdmin) {
            await sock.sendMessage(from, {
                text: '❌ *Bot Admin Required*\n\nI need admin privileges to execute this command.'
            }, { quoted: message });
            return false;
        }

        return true;
    }

    async handleCommand(sock, message, commandName, args) {
        const startTime = Date.now();
        const from = message.key.remoteJid;
        const sender = message.key.participant || from;
        const isGroup = from.endsWith('@g.us');

        try {
            const command = this.getCommand(commandName);
            
            if (!command) {
                logger.warn(`Command not found: ${commandName}`);
                return false;
            }

            const cooldownCheck = await this.checkCooldown(commandName, sender);
            if (cooldownCheck.onCooldown) {
                await sock.sendMessage(from, {
                    text: `⏱️ *Cooldown*\n\nPlease wait ${cooldownCheck.timeLeft} seconds before using this command again.`
                }, { quoted: message });
                return false;
            }

            let isGroupAdmin = false;
            let isBotAdmin = false;

            if (isGroup) {
                try {
                    const groupMetadata = await sock.groupMetadata(from);
                    const participant = groupMetadata.participants.find(p => p.id === sender);
                    isGroupAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';

                    const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
                    const botParticipant = groupMetadata.participants.find(p => p.id === botJid);
                    isBotAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';
                } catch (error) {
                    logger.error('Error fetching group metadata:', error);
                }
            }

            const hasPermission = await this.checkPermissions(
                command, sock, message, isGroup, isGroupAdmin, isBotAdmin
            );

            if (!hasPermission) {
                recordCommandUsage(commandName, Date.now() - startTime, false);
                return false;
            }

            if (command.minArgs && args.length < command.minArgs) {
                await sock.sendMessage(from, {
                    text: `❌ *Invalid Usage*\n\n*Usage:* ${config.prefix}${command.usage || command.name}\n*Example:* ${config.prefix}${command.example || command.name}`
                }, { quoted: message });
                return false;
            }

            logger.info(`⚡ Executing command: ${commandName} for ${sender.split('@')[0]}`);

            if (!command.execute || typeof command.execute !== 'function') {
                logger.error(`Command ${commandName} has no execute function`);
                await sock.sendMessage(from, {
                    text: `❌ *Error*\n\nCommand ${commandName} is not properly configured.`
                }, { quoted: message });
                return false;
            }

            await command.execute({
                sock,
                message,
                args,
                command,
                from,
                sender,
                isGroup,
                isGroupAdmin,
                isBotAdmin,
                prefix: config.prefix,
                pushName: message.pushName,
                quoted: message.message?.extendedTextMessage?.contextInfo?.quotedMessage,
                isOwner: this.isOwner(sender)
            });
            
            const executionTime = Date.now() - startTime;
            recordCommandUsage(commandName, executionTime, true);
            
            logger.info(`✅ Command ${commandName} executed successfully in ${executionTime}ms`);
            return true;

        } catch (error) {
            const executionTime = Date.now() - startTime;
            recordCommandUsage(commandName, executionTime, false);
            
            logger.error(`❌ Command execution error [${commandName}]:`, error);

            try {
                await sock.sendMessage(from, {
                    text: `❌ *Command Error*\n\n*Command:* ${commandName}\n*Error:* ${error.message}\n\nPlease try again or contact support if the issue persists.`
                }, { quoted: message });
            } catch (sendError) {
                logger.error('Failed to send error message:', sendError);
            }

            return false;
        }
    }

    getTopCommands(limit = 5) {
        try {
            const stats = getSystemStats();
            return [];
        } catch (error) {
            return [];
        }
    }
}

export const commandHandler = new CommandHandler();

export default commandHandler;
