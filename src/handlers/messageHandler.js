import config from '../config.js';
import logger from '../utils/logger.js';
import { cache } from '../utils/cache.js';

class MessageHandler {
    constructor() {
        this.commandHandler = null;
        this.isReady = false;
    }

    async initializeCommandHandler() {
        if (this.commandHandler && this.isReady) {
            return this.commandHandler;
        }

        try {
            const commandHandlerModule = await import('./commandHandler.js');
            this.commandHandler = commandHandlerModule.commandHandler;
            
            if (!this.commandHandler.isInitialized) {
                await this.commandHandler.initialize();
            }
            
            this.isReady = true;
            logger.info('Message handler ready to process commands');
            return this.commandHandler;
        } catch (error) {
            logger.error('Failed to initialize command handler:', error);
            throw error;
        }
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

    normalizePhoneNumber(jid) {
        if (!jid) return '';
        return jid.split('@')[0].replace(/:\d+$/, '').replace(/[^0-9]/g, '');
    }

    isOwner(sender) {
        if (!sender) return false;
        
        const senderNumber = this.normalizePhoneNumber(sender);
        
        if (config.ownerNumbers && Array.isArray(config.ownerNumbers)) {
            return config.ownerNumbers.some(ownerJid => {
                const ownerNumber = this.normalizePhoneNumber(ownerJid);
                return senderNumber === ownerNumber;
            });
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

            const text = messageContent.text;
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo;
            
            if (quotedMsg && quotedMsg.stanzaId) {
                if (global.replyHandlers && global.replyHandlers[quotedMsg.stanzaId]) {
                    const replyHandler = global.replyHandlers[quotedMsg.stanzaId];
                    
                    if (typeof replyHandler.handler === 'function') {
                        try {
                            await replyHandler.handler(text, message);
                            return;
                        } catch (error) {
                            logger.error('Reply handler error:', error);
                        }
                    }
                }
            }
            
            if (!text || text.length === 0) {
                return;
            }

            logger.info(`MESSAGE | From: ${sender.split('@')[0]} | ${isGroup ? 'GROUP' : 'PRIVATE'} | Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

            if (config.whitelist && config.whitelist.enabled) {
                if (!this.isOwner(sender) && !this.isSudo(sender)) {
                    logger.info(`Blocked by whitelist`);
                    return;
                }
            }

            const isOwnerUser = this.isOwner(sender);
            const ownerNoPrefix = config.ownerNoPrefix && isOwnerUser;
            const isPrefixed = text.startsWith(config.prefix);
            
            if (!isPrefixed && !ownerNoPrefix) {
                return;
            }

            const commandHandler = await this.initializeCommandHandler();
            if (!commandHandler) {
                logger.error('Command handler not initialized');
                return;
            }

            let commandText;
            if (ownerNoPrefix && !isPrefixed) {
                commandText = text.trim();
            } else {
                commandText = text.slice(config.prefix.length).trim();
            }
            
            if (!commandText || commandText.length === 0) {
                return;
            }

            const args = commandText.split(/\s+/);
            const commandName = args.shift()?.toLowerCase();

            if (!commandName) {
                return;
            }

            const command = commandHandler.getCommand(commandName);
            
            if (!command) {
                if (isPrefixed) {
                    const suggestions = commandHandler.searchCommands(commandName);
                    let response = `Command "${commandName}" not found.\n`;
                    
                    if (suggestions && suggestions.length > 0) {
                        response += `\nDid you mean:\n`;
                        suggestions.slice(0, 3).forEach(cmd => {
                            response += `  ${config.prefix}${cmd.name}\n`;
                        });
                    }
                    
                    response += `\nType ${config.prefix}help for all commands`;
                    
                    await sock.sendMessage(from, { text: response }, { quoted: message });
                }
                return;
            }

            logger.info(`EXECUTING: ${commandName} | User: ${sender.split('@')[0]} | Args: [${args.join(', ')}]`);
            
            try {
                await commandHandler.handleCommand(sock, message, commandName, args);
                logger.info(`Command ${commandName} executed successfully`);
            } catch (error) {
                logger.error(`Command ${commandName} failed:`, error);
                await sock.sendMessage(from, {
                    text: `Error executing ${commandName}: ${error.message}`
                }, { quoted: message });
            }

        } catch (error) {
            logger.error('Message handling error:', error);
        }
    }

    async handleMessageUpdate(sock, messageUpdates) {
        for (const update of messageUpdates) {
            try {
                const { key, update: messageUpdate } = update;
                if (messageUpdate && messageUpdate.message && key && key.id) {
                    logger.info(`Message updated: ${key.id}`);
                }
            } catch (error) {
                logger.error('Message update error:', error);
            }
        }
    }

    async handleMessageDelete(sock, deletedMessages) {
        for (const deletion of deletedMessages) {
            try {
                const { id, remoteJid } = deletion;
                logger.info(`Message deleted: ${id} from ${remoteJid}`);
            } catch (error) {
                logger.error('Message deletion error:', error);
            }
        }
    }

    async getMessageStats() {
        try {
            let stats = await cache.get('messageStats');
            if (!stats) {
                stats = {
                    totalMessages: 0,
                    commandsExecuted: 0,
                    mediaProcessed: 0,
                    groupMessages: 0,
                    privateMessages: 0
                };
            }
            return stats;
        } catch (error) {
            return {
                totalMessages: 0,
                commandsExecuted: 0,
                mediaProcessed: 0,
                groupMessages: 0,
                privateMessages: 0
            };
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