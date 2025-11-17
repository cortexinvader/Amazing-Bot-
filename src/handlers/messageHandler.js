import { aiService } from '../services/aiService.js';
import { commandHandler } from './commandHandler.js';
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
import { trackMessage } from '../commands/utility/profile.js';

class MessageHandler {
    constructor() {
        this.messageQueue = [];
        this.processing = false;
        this.autoReplyEnabled = true;
        this.chatBotEnabled = true;
    }

    extractMessageContent(message) {
        if (!message || !message.message) return null;

        const msg = message.message;
        let text = '';
        let messageType = 'text';
        let media = null;
        let quoted = null;

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
        }

        return { 
            text: text.trim(), 
            messageType, 
            media, 
            quoted 
        };
    }

    async downloadMedia(message, media) {
        try {
            const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
            const buffer = await downloadMediaMessage(message, 'buffer', {});
            const mediaType = media.mimetype?.split('/')[0] || 'unknown';
            const extension = media.mimetype?.split('/')[1] || 'bin';

            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
            const tempDir = path.join(process.cwd(), 'temp', mediaType);
            await fs.ensureDir(tempDir);

            const filePath = path.join(tempDir, fileName);
            await fs.writeFile(filePath, buffer);

            return {
                buffer,
                filePath,
                fileName,
                mimetype: media.mimetype,
                size: buffer.length
            };
        } catch (error) {
            logger.error('Failed to download media:', error);
            return null;
        }
    }

    detectPrefix(text) {
        if (!text || typeof text !== 'string') return null;
        const trimmedText = text.trim();
        if (trimmedText.startsWith(config.prefix)) {
            return config.prefix;
        }
        return null;
    }

    shouldProcessNoPrefix(text, isGroup, group, sender) {
        if (config.ownerNoPrefix && commandHandler.isOwner(sender)) {
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
        
        const prefixUsed = this.detectPrefix(trimmedText);
        const shouldProcessNoPrefix = this.shouldProcessNoPrefix(trimmedText, isGroup, group, sender);
        
        console.log(`🔍 PREFIX CHECK | Text: "${trimmedText.substring(0, 50)}" | Prefix: ${prefixUsed || 'none'} | NoPrefix: ${shouldProcessNoPrefix}`);
        
        if (!prefixUsed && !shouldProcessNoPrefix) {
            console.log(`❌ NOT A COMMAND - No prefix detected`);
            return false;
        }

        const commandText = prefixUsed 
            ? trimmedText.slice(prefixUsed.length).trim() 
            : trimmedText.trim();

        if (!commandText || commandText.length === 0) {
            console.log(`❌ NOT A COMMAND - Empty command text`);
            return false;
        }

        const splitArgs = commandText.split(/\s+/);
        const commandName = splitArgs.shift()?.toLowerCase();

        if (!commandName || commandName.length === 0) {
            console.log(`❌ NOT A COMMAND - No command name`);
            return false;
        }

        const args = splitArgs;
        const command = commandHandler.getCommand(commandName);
        
        console.log(`🔎 COMMAND LOOKUP | Name: "${commandName}" | Found: ${command ? 'YES' : 'NO'}`);
        
        if (!command) {
            if (prefixUsed) {
                await this.handleUnknownCommand(sock, message, commandName);
            }
            return false;
        }

        console.log(`⚡ EXECUTING COMMAND: ${commandName} | User: ${sender.split('@')[0]}`);
        logger.info(`Executing command: ${commandName} | User: ${sender.split('@')[0]} | Type: ${isGroup ? 'group' : 'private'}`);
        
        try {
            await commandHandler.handleCommand(sock, message, commandName, args);
            return true;
        } catch (error) {
            logger.error(`Command execution failed [${commandName}]:`, error);
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

    async handleUnknownCommand(sock, message, commandName) {
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

    async handleAutoReply(sock, message, text, user, isGroup) {
        if (!this.autoReplyEnabled || isGroup) return false;

        const autoReplies = cache.get('autoReplies') || {};
        const lowerText = text.toLowerCase();
        
        for (const [trigger, reply] of Object.entries(autoReplies)) {
            if (lowerText.includes(trigger.toLowerCase())) {
                try {
                    await sock.sendMessage(message.key.remoteJid, { text: reply });
                    return true;
                } catch (error) {
                    logger.error('Auto reply failed:', error);
                }
            }
        }

        return false;
    }

    async handleChatBot(sock, message, text, user, isGroup) {
        if (!this.chatBotEnabled) return false;
        if (isGroup && sock.user && !text.includes('@' + sock.user.id.split(':')[0])) return false;

        try {
            const response = await aiService.generateResponse(text, user, isGroup);
            
            if (response) {
                await sock.sendMessage(message.key.remoteJid, { 
                    text: response,
                    contextInfo: {
                        mentionedJid: isGroup ? [user.jid] : undefined
                    }
                });
                return true;
            }
        } catch (error) {
            logger.error('ChatBot error:', error);
        }

        return false;
    }

    async handleMentions(sock, message, text, isGroup) {
        if (!isGroup || !text.includes('@')) return;

        const mentions = text.match(/@(\d+)/g);
        if (!mentions) return;

        const mentionedUsers = mentions.map(mention => 
            mention.replace('@', '') + '@s.whatsapp.net'
        );

        const from = message.key.remoteJid;
        try {
            const metadata = await sock.groupMetadata(from);
            const validMentions = mentionedUsers.filter(jid =>
                metadata.participants.some(p => p.id === jid)
            );

            if (validMentions.length > 0) {
                await updateGroup(from, {
                    $inc: { mentionsCount: validMentions.length }
                });
            }
        } catch (error) {
            logger.error('Error handling mentions:', error);
        }
    }

    async handleQuotedMessage(sock, message, quoted, user) {
        if (!quoted) return;

        try {
            const quotedContent = this.extractMessageContent({ message: quoted });
            if (quotedContent?.media) {
                const mediaData = await this.downloadMedia(message, quotedContent.media);
                if (mediaData) {
                    logger.debug('Quoted media processed successfully');
                }
            }
        } catch (error) {
            logger.error('Error handling quoted message:', error);
        }
    }

    async saveMessage(message, user, group, messageContent) {
        try {
            const messageData = {
                messageId: message.key.id,
                from: message.key.remoteJid,
                sender: message.key.participant || message.key.remoteJid,
                timestamp: message.messageTimestamp * 1000,
                content: messageContent.text,
                messageType: messageContent.messageType,
                isGroup: !!group,
                hasMedia: !!messageContent.media,
                isCommand: messageContent.text.startsWith(config.prefix),
                userData: {
                    phone: user.phone,
                    name: user.name
                }
            };

            await createMessage(messageData);
        } catch (error) {
            logger.error('Failed to save message:', error);
        }
    }

    async handleIncomingMessage(sock, message) {
        try {
            if (!message || !message.key) {
                return;
            }
            
            if (message.key.fromMe && !config.selfMode) {
                return;
            }
            
            const from = message.key.remoteJid;
            if (!from || from === 'status@broadcast') {
                return;
            }

            const sender = message.key.participant || from;
            const isGroup = from.endsWith('@g.us');
            
            const messageContent = this.extractMessageContent(message);
            if (!messageContent || !messageContent.text) {
                console.log(`⚠️  Message skipped - No text content`);
                return;
            }

            console.log(`📨 NEW MESSAGE | From: ${sender.split('@')[0]} | Text: "${messageContent.text.substring(0, 100)}"`);
            logger.debug(`Message received | From: ${sender.split('@')[0]} | Chat: ${isGroup ? 'group' : 'private'} | Text: ${messageContent.text.substring(0, 50)}`);

            const spamCheck = await antiSpam.checkSpam(sender, message);
            if (spamCheck.isSpam && spamCheck.action === 'block') {
                logger.debug(`Spam detected from ${sender.split('@')[0]}`);
                return;
            }

            let user = await getUser(sender);
            if (!user) {
                user = await createUser({
                    jid: sender,
                    phone: sender.split('@')[0].replace(/:\d+$/, ''),
                    name: message.pushName || 'Unknown',
                    isGroup: false
                });
                logger.debug(`New user created: ${sender.split('@')[0]}`);
            } else {
                await updateUser(sender, {
                    name: message.pushName || user.name,
                    lastSeen: new Date(),
                    $inc: { messageCount: 1 }
                });
            }

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
                        logger.debug(`New group created: ${metadata.subject}`);
                    } catch (error) {
                        logger.error('Failed to create group:', error);
                    }
                } else {
                    await updateGroup(from, {
                        $inc: { messageCount: 1 },
                        lastActivity: new Date()
                    });
                }
            }

            await this.saveMessage(message, user, group, messageContent);

            if (messageContent.quoted) {
                await this.handleQuotedMessage(sock, message, messageContent.quoted, user);
            }

            const quotedMessageId = message.message?.extendedTextMessage?.contextInfo?.stanzaId;
            if (quotedMessageId && global.replyHandlers && global.replyHandlers[quotedMessageId]) {
                const replyHandler = global.replyHandlers[quotedMessageId];
                try {
                    await replyHandler.handler(messageContent.text, message);
                    logger.debug('Reply handler executed');
                } catch (error) {
                    logger.error('Reply handler error:', error);
                }
                return;
            }

            if (global.chatHandlers && global.chatHandlers[sender]) {
                const chatHandler = global.chatHandlers[sender];
                try {
                    await chatHandler.handler(messageContent.text, message);
                    logger.debug('Chat handler executed');
                } catch (error) {
                    logger.error('Chat handler error:', error);
                }
                return;
            }

            await this.handleMentions(sock, message, messageContent.text, isGroup);

            try {
                await handleAntiLink(sock, message);
            } catch (error) {
                logger.error('Anti-link error:', error);
            }
            
            try {
                await handleAutoReaction(sock, message);
            } catch (error) {
                logger.error('Auto-reaction error:', error);
            }

            const isCommand = await this.processCommand(
                sock, message, messageContent.text, user, group, isGroup
            );

            if (isCommand) {
                console.log(`✅ COMMAND EXECUTED`);
                logger.debug(`Command processed successfully`);
                try {
                    await handleLevelUp(sock, message, true);
                } catch (error) {
                    logger.error('Level up error:', error);
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

            if (isGroup) {
                try {
                    trackMessage(sender, from, false);
                } catch (error) {
                    logger.error('Track message error:', error);
                }
            }

            try {
                await handleLevelUp(sock, message, false);
            } catch (error) {
                logger.error('Level up error:', error);
            }

            const autoReplyHandled = await this.handleAutoReply(sock, message, messageContent.text, user, isGroup);
            
            if (!autoReplyHandled) {
                await this.handleChatBot(sock, message, messageContent.text, user, isGroup);
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
                
                if (messageUpdate.message) {
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
                    try {
                        trackMessage(deletedBy, remoteJid, true);
                    } catch (error) {
                        logger.error('Track delete error:', error);
                    }

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
                
                cache.del(`message_${id}`);
                
            } catch (error) {
                logger.error('Message deletion handling error:', error);
            }
        }
    }

    setAutoReplyStatus(enabled) {
        this.autoReplyEnabled = enabled;
        logger.info(`Auto-reply ${enabled ? 'enabled' : 'disabled'}`);
    }

    setChatBotStatus(enabled) {
        this.chatBotEnabled = enabled;
        logger.info(`ChatBot ${enabled ? 'enabled' : 'disabled'}`);
    }

    async getMessageStats() {
        let stats = cache.get('messageStats');
        
        if (!stats || typeof stats !== 'object') {
            stats = {
                totalMessages: 0,
                commandsExecuted: 0,
                mediaProcessed: 0,
                groupMessages: 0,
                privateMessages: 0
            };
            cache.set('messageStats', stats, 3600);
        }
        
        return stats;
    }

    async updateMessageStats(type) {
        try {
            let stats = await this.getMessageStats();
            
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
            
            cache.set('messageStats', stats, 3600);
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
    setAutoReplyStatus: (enabled) => messageHandler.setAutoReplyStatus(enabled),
    setChatBotStatus: (enabled) => messageHandler.setChatBotStatus(enabled),
    getMessageStats: () => messageHandler.getMessageStats(),
    extractMessageContent: (message) => messageHandler.extractMessageContent(message),
    downloadMedia: (message, media) => messageHandler.downloadMedia(message, media)
};