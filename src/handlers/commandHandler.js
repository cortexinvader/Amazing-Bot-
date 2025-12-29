import config from '../config.js';
import logger from '../utils/logger.js';
import { 
    commandManager,
    getCommand,
    getAllCommands,
    getCommandsByCategory,
    searchCommands as searchCommandsUtil,
    getAllCategories,
    recordCommandUsage as recordUsage
} from '../utils/commandManager.js';

class CommandHandler {
    constructor() {
        this.cooldowns = new Map();
        this.userCooldowns = new Map();
        this.commandExecutions = new Map();
        this.isInitialized = false;
        this.commandStats = new Map();
    }

    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            await commandManager.initializeCommands();
            this.isInitialized = true;
            logger.info(`Command handler initialized with ${getAllCommands().length} commands`);
            return true;
        } catch (error) {
            logger.error('Command handler initialization failed:', error);
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
        const totalExecutions = Array.from(this.commandStats.values()).reduce((sum, cmd) => sum + cmd.count, 0);
        const successfulExecutions = Array.from(this.commandStats.values()).reduce((sum, cmd) => sum + cmd.successCount, 0);
        
        const commandUsage = {};
        this.commandStats.forEach((stats, name) => {
            commandUsage[name] = {
                count: stats.count,
                successCount: stats.successCount,
                failureCount: stats.failureCount,
                totalTime: stats.totalTime,
                avgTime: stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0
            };
        });
        
        return {
            totalExecutions,
            successfulExecutions,
            failedExecutions: totalExecutions - successfulExecutions,
            commandUsage
        };
    }

    recordCommandUsage(commandName, executionTime, success) {
        if (!this.commandStats.has(commandName)) {
            this.commandStats.set(commandName, {
                count: 0,
                successCount: 0,
                failureCount: 0,
                totalTime: 0
            });
        }
        
        const stats = this.commandStats.get(commandName);
        stats.count++;
        if (success) {
            stats.successCount++;
        } else {
            stats.failureCount++;
        }
        stats.totalTime += executionTime;
        
        this.commandStats.set(commandName, stats);

        try {
            recordUsage(commandName, executionTime, success);
        } catch (error) {
            logger.error('Error recording usage in commandManager:', error);
        }
    }

    normalizePhoneNumber(jid) {
        if (!jid) return '';
        let cleaned = jid.split('@')[0];
        cleaned = cleaned.split(':')[0];
        cleaned = cleaned.replace(/[^0-9]/g, '');
        return cleaned;
    }

    isOwner(sender) {
        if (!sender) return false;
        
        const senderNumber = this.normalizePhoneNumber(sender);
        
        if (config.ownerNumbers && Array.isArray(config.ownerNumbers)) {
            const isOwnerResult = config.ownerNumbers.some(ownerJid => {
                const ownerNumber = this.normalizePhoneNumber(ownerJid);
                return senderNumber === ownerNumber;
            });
            
            if (isOwnerResult) {
                logger.debug(`Owner verified: ${senderNumber}`);
            }
            
            return isOwnerResult;
        }
        
        return false;
    }

    isSudo(sender) {
        if (!sender) return false;
        if (this.isOwner(sender)) return true;
        
        const senderNumber = this.normalizePhoneNumber(sender);
        
        if (config.sudoers && Array.isArray(config.sudoers)) {
            return config.sudoers.some(sudoJid => {
                const sudoNumber = this.normalizePhoneNumber(sudoJid);
                return senderNumber === sudoNumber;
            });
        }
        
        return false;
    }

    async checkCooldown(commandName, sender) {
        const command = this.getCommand(commandName);
        if (!command || !command.cooldown) return { onCooldown: false };

        if (this.isOwner(sender) || this.isSudo(sender)) return { onCooldown: false };

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

        const isOwnerUser = this.isOwner(sender);
        const isSudoUser = this.isSudo(sender);

        if (command.ownerOnly && !isOwnerUser && !isSudoUser) {
            await sock.sendMessage(from, {
                text: '❌ Access Denied\n\nThis command is only available to the bot owner.'
            }, { quoted: message });
            return false;
        }

        if (command.sudoOnly && !isSudoUser) {
            await sock.sendMessage(from, {
                text: '❌ Access Denied\n\nThis command is only available to sudo users.'
            }, { quoted: message });
            return false;
        }

        if (command.groupOnly && !isGroup) {
            await sock.sendMessage(from, {
                text: '❌ Group Only\n\nThis command can only be used in groups.'
            }, { quoted: message });
            return false;
        }

        if (command.privateOnly && isGroup) {
            await sock.sendMessage(from, {
                text: '❌ Private Only\n\nThis command can only be used in private chat.'
            }, { quoted: message });
            return false;
        }

        if (isGroup && command.adminOnly && !isGroupAdmin && !isOwnerUser && !isSudoUser) {
            await sock.sendMessage(from, {
                text: '❌ Admin Only\n\nThis command requires group admin privileges.'
            }, { quoted: message });
            return false;
        }

        if (isGroup && command.botAdminRequired && !isBotAdmin) {
            await sock.sendMessage(from, {
                text: '❌ Bot Admin Required\n\nI need admin privileges to execute this command.'
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

            const isOwnerUser = this.isOwner(sender);
            const isSudoUser = this.isSudo(sender);

            logger.debug(`Command: ${commandName} | Sender: ${sender} | IsOwner: ${isOwnerUser} | IsSudo: ${isSudoUser}`);

            const cooldownCheck = await this.checkCooldown(commandName, sender);
            if (cooldownCheck.onCooldown) {
                await sock.sendMessage(from, {
                    text: `⏰ Cooldown\n\nPlease wait ${cooldownCheck.timeLeft} seconds before using this command again.`
                }, { quoted: message });
                return false;
            }

            let isGroupAdmin = false;
            let isBotAdmin = false;

            if (isGroup) {
                try {
                    const groupMetadata = await sock.groupMetadata(from);
                    
                    const senderNumber = this.normalizePhoneNumber(sender);
                    const participant = groupMetadata.participants.find(p => {
                        const participantNumber = this.normalizePhoneNumber(p.id);
                        return participantNumber === senderNumber;
                    });
                    
                    isGroupAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin' || isOwnerUser || isSudoUser;

                    const botJid = sock.user?.id;
                    const botNumber = this.normalizePhoneNumber(botJid);
                    const botParticipant = groupMetadata.participants.find(p => {
                        const participantNumber = this.normalizePhoneNumber(p.id);
                        return participantNumber === botNumber;
                    });
                    
                    isBotAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';

                    logger.debug(`Group: ${from} | IsGroupAdmin: ${isGroupAdmin} | IsBotAdmin: ${isBotAdmin}`);
                } catch (error) {
                    logger.error('Error fetching group metadata:', error);
                    isGroupAdmin = isOwnerUser || isSudoUser;
                    isBotAdmin = false;
                }
            }

            const hasPermission = await this.checkPermissions(
                command, sock, message, isGroup, isGroupAdmin, isBotAdmin
            );

            if (!hasPermission) {
                this.recordCommandUsage(commandName, Date.now() - startTime, false);
                return false;
            }

            if (command.args && args.length < (command.minArgs || 1)) {
                await sock.sendMessage(from, {
                    text: `❌ Invalid Usage\n\nUsage: ${config.prefix}${command.usage || command.name}\nExample: ${config.prefix}${command.example || command.name}`
                }, { quoted: message });
                return false;
            }

            logger.info(`Executing command: ${commandName} for ${sender.split('@')[0]}`);

            if (!command.execute || typeof command.execute !== 'function') {
                logger.error(`Command ${commandName} has no execute function`);
                await sock.sendMessage(from, {
                    text: `❌ Error\n\nCommand ${commandName} is not properly configured.`
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
                isOwner: isOwnerUser,
                isSudo: isSudoUser
            });
            
            const executionTime = Date.now() - startTime;
            this.recordCommandUsage(commandName, executionTime, true);
            
            logger.info(`Command ${commandName} executed successfully in ${executionTime}ms`);
            return true;

        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.recordCommandUsage(commandName, executionTime, false);
            
            logger.error(`Command execution error [${commandName}]:`, error);

            try {
                await sock.sendMessage(from, {
                    text: `❌ Command Error\n\nCommand: ${commandName}\nError: ${error.message}\n\nPlease try again or contact support if the issue persists.`
                }, { quoted: message });
            } catch (sendError) {
                logger.error('Failed to send error message:', sendError);
            }

            return false;
        }
    }

    getTopCommands(limit = 5) {
        try {
            const stats = this.getCommandStats();
            if (!stats || !stats.commandUsage) {
                return [];
            }
            
            return Object.entries(stats.commandUsage)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, limit)
                .map(([name, data]) => ({
                    name,
                    used: data.count,
                    successRate: data.count > 0 ? 
                        ((data.successCount / data.count) * 100).toFixed(1) : '0'
                }));
        } catch (error) {
            logger.error('Error getting top commands:', error);
            return [];
        }
    }

    async reloadCommand(commandName) {
        try {
            await commandManager.reloadCommand(commandName);
            return true;
        } catch (error) {
            logger.error(`Failed to reload command ${commandName}:`, error);
            return false;
        }
    }
}

export const commandHandler = new CommandHandler();

export default commandHandler;