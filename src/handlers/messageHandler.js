import config from '../config.js';
import logger from '../utils/logger.js';
import { getUser, createUser, updateUser } from '../models/User.js';
import { getGroup, createGroup, updateGroup } from '../models/Group.js';
import { createMessage } from '../models/Message.js';
import antiSpam from '../utils/antiSpam.js';
import { cache } from '../utils/cache.js';
import fs from 'fs-extra';
import path from 'path';
import handleAutoReaction from '../events/autoReaction.js';
import handleAntiLink from '../plugins/antiLink.js';
import handleLevelUp from '../events/levelUp.js';

class MessageHandler {
    constructor() {
        this.messageQueue = [];
        this.processing = false;
        this.commandHandler = null;
        this.isReady = false;
        this.initializationPromise = null;
        this.initialized = false;
    }

    async initializeCommandHandler() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = (async () => {
            try {
                if (!this.commandHandler) {
                    const commandHandlerModule = await import('./commandHandler.js');
                    this.commandHandler = commandHandlerModule.commandHandler;
                    
                    if (!this.commandHandler.isInitialized) {
                        logger.info('🔧 Initializing command handler from message handler...');
                        await this.commandHandler.initialize();
                    }
                    
                    this.isReady = true;
                    this.initialized = true;
                    logger.info('✅ Message handler ready to process commands');
                }
                return this.commandHandler;
            } catch (error) {
                logger.error('Failed to initialize command handler:', error);
                throw error;
            }
        })();

        return this.initializationPromise;
    }

    extractMessageContent(message) {
        if (!message || !message.message) {
            return null;
        }

        const msg = message.message;
        let text = '';
        let messageType = 'text';
        let media = null;
        let quoted = null;

        try {
            if (msg.ephemeralMessage?.message) {
                return this.extractMessageContent({ message: msg.ephemeralMessage.message });
            }

            if (msg.viewOnceMessage?.message) {
                return this.extractMessageContent({ message: msg.viewOnceMessage.message });
            }

            if (msg.viewOnceMessageV2?.message) {
                return this.extractMessageContent({ message: msg.viewOnceMessageV2.message });
            }

            if (msg.documentWithCaptionMessage?.message) {
                return this.extractMessageContent({ message: msg.documentWithCaptionMessage.message });
            }

            if (msg.conversation) {
                text = msg.conversation;
            } else if (msg.extendedTextMessage) {
                text = msg.extendedTextMessage.text || '';
                quoted = msg.extendedTextMessage.contextInfo?.quotedMessage;
            } else if (msg.imageMessage) {
                text = msg.imageMessage.caption || '';
                messageType = 'image';
                media = msg.imageMessage;
            } else if (msg.videoMessage) {
                text = msg.videoMessage.caption || '';
                messageType = 'video';
                media = msg.videoMessage;
            } else if (msg.audioMessage) {
                messageType = 'audio';
                media = msg.audioMessage;
            } else if (msg.documentMessage) {
                text = msg.documentMessage.caption || '';
                messageType = 'document';
                media = msg.documentMessage;
            } else if (msg.stickerMessage) {
                messageType = 'sticker';
                media = msg.stickerMessage;
            } else if (msg.contactMessage) {
                messageType = 'contact';
                text = msg.contactMessage.displayName || '';
            } else if (msg.locationMessage) {
                messageType = 'location';
                text = msg.locationMessage.name || 'Location';
            } else if (msg.liveLocationMessage) {
                messageType = 'liveLocation';
                text = msg.liveLocationMessage.caption || 'Live Location';
            } else if (msg.pollCreationMessage) {
                messageType = 'poll';
                text = msg.pollCreationMessage.name || '';
            } else if (msg.buttonsResponseMessage) {
                text = msg.buttonsResponseMessage.selectedButtonId || '';
                messageType = 'buttonResponse';
            } else if (msg.listResponseMessage) {
                text = msg.listResponseMessage.singleSelectReply?.selectedRowId || '';
                messageType = 'listResponse';
            } else if (msg.templateButtonReplyMessage) {
                text = msg.templateButtonReplyMessage.selectedId || '';
                messageType = 'templateButtonReply';
            } else if (msg.protocolMessage) {
                return null;
            } else if (msg.reactionMessage) {
                return null;
            } else {
                return null;
            }

            return { 
                text: text.trim(), 
                messageType, 
                media, 
                quoted 
            };
        } catch (error) {
            logger.error('Error extracting message content:', error);
            return null;
        }
    }

    detectPrefix(text) {
        if (!text || typeof text !== 'string') {
            return null;
        }
        const trimmedText = text.trim();
        if (trimmedText.startsWith(config.prefix)) {
            return config.prefix;
        }
        return null;
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
        
        const senderNumber = sender.split('@')[0].replace(/:\d+$/, '');
        
        if (config.sudoers && Array.isArray(config.sudoers)) {
            return config.sudoers.some(sudoJid => {
                const sudoNumber = sudoJid.split('@')[0].replace(/:\d+$/, '');
                return senderNumber === sudoNumber;
            });
        }
        
        return false;
    }

    shouldProcessNoPrefix(text, isGroup, group, sender) {
        if (config.ownerNoPrefix && this.isOwner(sender)) {
            return true;
        }
        
        if (!config.noPrefixEnabled) return false;
        
        if (isGroup) {
            return group?.settings?.noPrefixEnabled === true;
        }
        
        return config.privateNoPrefixEnabled === true;
    }

    async processCommand(sock, message, text, user, group, isGroup) {
        if (!text || typeof text !== 'string') {
            return false;
        }

        const trimmedText = text.trim();
        if (trimmedText.length === 0) {
            return false;
        }

        const from = message.key.remoteJid;
        const sender = message.key.participant || from;
        
        await this.initializeCommandHandler();
        
        const prefixUsed = this.detectPrefix(trimmedText);
        const shouldProcessNoPrefix = this.shouldProcessNoPrefix(trimmedText, isGroup, group, sender);
        
        if (!prefixUsed && !shouldProcessNoPrefix) {
            return false;
        }

        const commandText = prefixUsed 
            ? trimmedText.slice(prefixUsed.length).trim() 
            : trimmedText.trim();

        if (!commandText || commandText.length === 0) {
            return false;
        }

        const splitArgs = commandText.split(/\s+/);
        const commandName = splitArgs.shift()?.toLowerCase();

        if (!commandName || commandName.length === 0) {
            return false;
        }

        const args = splitArgs;
        const command = this.commandHandler.getCommand(commandName);
        
        if (!command) {
            if (prefixUsed) {
                await this.handleUnknownCommand(sock, message, commandName, this.commandHandler);
            }
            return false;
        }

        logger.info(`⚡ EXECUTING COMMAND: ${commandName} | User: ${sender.split('@')[0]} | Args: [${args.join(', ')}]`);
        
        try {
            const result = await this.commandHandler.handleCommand(sock, message, commandName, args);
            logger.info(`✅ Command ${commandName} executed successfully`);
            return true;
        } catch (error) {
            logger.error(`❌ Command execution failed [${commandName}]:`, error);
            try {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\n\nFailed to execute command: ${commandName}\n\nError: ${error.message}`
                }, { quoted: message });
            } catch (sendError) {
                logger.error('Failed to send error message:', sendError);
            }
            return false;
        }
    }

    async handleUnknownCommand(sock, message, commandName, commandHandler) {
        const from = message.key.remoteJid;
        const suggestions = await commandHandler.searchCommands(commandName);
        
        let response = `╭──⦿【 ❓ UNKNOWN COMMAND 】\n`;
        response += `│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: "${commandName}" is not valid\n`;
        response += `│\n`;
        
        if (suggestions.length > 0) {
            response += `│ 💡 𝗗𝗶𝗱 𝘆𝗼𝘂 𝗺𝗲𝗮𝗻:\n`;
            suggestions.slice(0, 3).forEach(cmd => {
                response += `│    • ${config.prefix}${cmd.name}\n`;
                response += `│      ${cmd.description}\n`;
            });
            response += `│\n`;
        }
        
        response += `│ 📚 𝗧𝗶𝗽: Type ${config.prefix}help for all commands\n`;
        response += `╰────────⦿\n\n`;
        response += `╭─────────────⦿\n`;
        response += `│💫 | [ ${config.botName} 🍀 ]\n`;
        response += `╰────────────⦿`;
        
        try {
            await sock.sendMessage(from, { text: response }, { quoted: message });
        } catch (error) {
            logger.error('Failed to send unknown command message:', error);
        }
    }

    async checkWhitelist(sender, from) {
        try {
            if (!config.whitelist.enabled) {
                return { allowed: true, reason: 'whitelist_disabled_in_config' };
            }

            if (config.whitelist.bypassOwners && this.isOwner(sender)) {
                return { allowed: true, reason: 'owner_bypass' };
            }

            if (config.whitelist.bypassSudos && this.isSudo(sender)) {
                return { allowed: true, reason: 'sudo_bypass' };
            }

            return { allowed: true, reason: 'not_implemented' };
            
        } catch (error) {
            logger.error('Whitelist check error:', error);
            return { allowed: true, reason: 'error_fallback' };
        }
    }

    async handleIncomingMessage(sock, message) {
        try {
            if (!message || !message.key) {
                return;
            }
            
            const from = message.key.remoteJid;
            const fromMe = message.key.fromMe;
            
            if (fromMe && !config.selfMode) {
                return;
            }
            
            if (!from || from === 'status@broadcast') {
                return;
            }

            const sender = message.key.participant || from;
            const isGroup = from.endsWith('@g.us');

            const messageContent = this.extractMessageContent(message);
            if (!messageContent) {
                return;
            }

            if (!messageContent.text && messageContent.messageType === 'text') {
                return;
            }

            const textPreview = messageContent.text.substring(0, 50) + (messageContent.text.length > 50 ? '...' : '');
            logger.info(`📨 NEW MESSAGE | From: ${sender.split('@')[0]} | Type: ${messageContent.messageType} | ${isGroup ? 'GROUP' : 'PRIVATE'} | Text: "${textPreview}"`);

            const whitelistResult = await this.checkWhitelist(sender, from);
            if (!whitelistResult.allowed) {
                logger.info(`🚫 Blocked by whitelist: ${whitelistResult.reason}`);
                if (!isGroup) {
                    try {
                        await sock.sendMessage(from, {
                            text: `⚠️ *Access Restricted*\n\nThis bot is currently in whitelist mode. Only authorized users can interact with it.\n\nContact the bot owner for access.`
                        }, { quoted: message });
                    } catch (error) {
                        logger.debug('Failed to send whitelist notification:', error);
                    }
                }
                return;
            }

            const spamCheck = await antiSpam.checkSpam(sender, message);
            if (spamCheck.isSpam && spamCheck.action === 'block') {
                logger.info(`🔴 Spam blocked from ${sender.split('@')[0]}`);
                return;
            }

            let user = await getUser(sender);
            let group = null;

            if (isGroup) {
                group = await getGroup(from);
                if (!group) {
                    try {
                        const metadata = await sock.groupMetadata(from);
                        group = await createGroup({
                            jid: from,
                            name: metadata.subject,
                            participants: metadata.participants.length,
                            createdBy: metadata.owner,
                            createdAt: new Date(metadata.creation * 1000)
                        });
                    } catch (error) {
                        logger.error('Failed to create group:', error);
                    }
                } else {
                    await updateGroup(from, {
                        $inc: { messageCount: 1 },
                        lastActivity: new Date()
                    }).catch(err => logger.debug('Update group error:', err));
                }
            }

            if (!user) {
                user = await createUser({
                    jid: sender,
                    phone: sender.split('@')[0].replace(/:\d+$/, ''),
                    name: message.pushName || 'Unknown',
                    isGroup: false
                });
                logger.info(`✨ Created new user: ${sender.split('@')[0]}`);
            }

            const isCommand = await this.processCommand(
                sock, message, messageContent.text, user, group, isGroup
            );

            if (isCommand) {
                logger.info(`✅ Command processed successfully`);
                if (config.events.levelUp) {
                    try {
                        await handleLevelUp(sock, message, true);
                    } catch (error) {
                        logger.error('Level up error:', error);
                    }
                }
                
                cache.set(`lastMessage_${sender}`, {
                    content: messageContent.text,
                    timestamp: Date.now(),
                    messageType: messageContent.messageType,
                    isGroup
                }, 300);

                await this.updateMessageStats('command');
                return;
            }

            await updateUser(sender, {
                name: message.pushName || user.name,
                lastSeen: new Date(),
                $inc: { messageCount: 1 }
            }).catch(err => logger.debug('Update user error:', err));

            if (config.features.antiLink) {
                try {
                    await handleAntiLink(sock, message);
                } catch (error) {
                    logger.error('Anti-link error:', error);
                }
            }
            
            if (config.events.autoReaction) {
                try {
                    await handleAutoReaction(sock, message);
                } catch (error) {
                    logger.error('Auto-reaction error:', error);
                }
            }

            if (config.events.levelUp) {
                try {
                    await handleLevelUp(sock, message, false);
                } catch (error) {
                    logger.error('Level up error:', error);
                }
            }

            cache.set(`lastMessage_${sender}`, {
                content: messageContent.text,
                timestamp: Date.now(),
                messageType: messageContent.messageType,
                isGroup
            }, 300);

            await this.updateMessageStats(isGroup ? 'group' : 'private');

        } catch (error) {
            logger.error('Critical message handling error:', {
                error: error.message,
                stack: error.stack,
                from: message?.key?.remoteJid,
                messageId: message?.key?.id
            });
        }
    }

    async handleMessageUpdate(sock, messageUpdates) {
        for (const update of messageUpdates) {
            try {
                const { key, update: messageUpdate } = update;
                
                if (messageUpdate && messageUpdate.message && key && key.id) {
                    logger.info(`Message updated: ${key.id}`);
                    
                    const updatedContent = this.extractMessageContent(messageUpdate);
                    if (updatedContent) {
                        cache.set(`updatedMessage_${key.id}`, {
                            content: updatedContent.text,
                            timestamp: Date.now()
                        }, 300);
                    }
                }
            } catch (error) {
                logger.error('Message update handling error:', error);
            }
        }
    }

    async handleMessageDelete(sock, deletedMessages) {
        for (const deletion of deletedMessages) {
            try {
                const { fromMe, id, participant, remoteJid } = deletion;
                
                logger.info(`Message deleted: ${id} from ${remoteJid}`);
                
                const isGroup = remoteJid.endsWith('@g.us');
                const deletedBy = participant || remoteJid;
                
                if (isGroup) {
                    if (config.features.antiDelete) {
                        const group = await getGroup(remoteJid);
                        if (group?.settings?.antiDelete) {
                            const cachedMessage = cache.get(`message_${id}`);
                            if (cachedMessage) {
                                await sock.sendMessage(remoteJid, {
                                    text: `🗑️ *Anti-Delete*\n\n*Deleted by:* @${deletedBy.split('@')[0]}\n*Content:* ${cachedMessage.content}\n*Time:* ${new Date(cachedMessage.timestamp).toLocaleString()}`,
                                    contextInfo: {
                                        mentionedJid: [deletedBy]
                                    }
                                });
                            }
                        }
                    }
                }
                
                cache.del(`message_${id}`);
                
            } catch (error) {
                logger.error('Message deletion handling error:', error);
            }
        }
    }

    async getMessageStats() {
        try {
            let stats = await cache.get('messageStats');
            
            if (!stats || typeof stats !== 'object') {
                stats = {
                    totalMessages: 0,
                    commandsExecuted: 0,
                    mediaProcessed: 0,
                    groupMessages: 0,
                    privateMessages: 0
                };
                await cache.set('messageStats', stats, 3600);
            }
            
            return stats;
        } catch (error) {
            logger.error('Error getting message stats:', error);
            return {
                totalMessages: 0,
                commandsExecuted: 0,
                mediaProcessed: 0,
                groupMessages: 0,
                privateMessages: 0
            };
        }
    }

    async updateMessageStats(type) {
        try {
            let stats = await this.getMessageStats();
            
            if (!stats) {
                stats = {
                    totalMessages: 0,
                    commandsExecuted: 0,
                    mediaProcessed: 0,
                    groupMessages: 0,
                    privateMessages: 0
                };
            }
            
            stats.totalMessages = (stats.totalMessages || 0) + 1;
            
            switch (type) {
                case 'command':
                    stats.commandsExecuted = (stats.commandsExecuted || 0) + 1;
                    break;
                case 'media':
                    stats.mediaProcessed = (stats.mediaProcessed || 0) + 1;
                    break;
                case 'group':
                    stats.groupMessages = (stats.groupMessages || 0) + 1;
                    break;
                case 'private':
                    stats.privateMessages = (stats.privateMessages || 0) + 1;
                    break;
            }
            
            await cache.set('messageStats', stats, 3600);
        } catch (error) {
            logger.error('Failed to update message stats:', error);
        }
    }
}

export const messageHandler = new MessageHandler();

export default {
    messageHandler,
    handleIncomingMessage: (sock, message) => messageHandler.handleIncomingMessage(sock, message),
    handleMessageUpdate: (sock, updates) => messageHandler.handleMessageUpdate(sock, updates),
    handleMessageDelete: (sock, deletions) => messageHandler.handleMessageDelete(sock, deletions),
    getMessageStats: () => messageHandler.getMessageStats(),
    extractMessageContent: (message) => messageHandler.extractMessageContent(message)
};
