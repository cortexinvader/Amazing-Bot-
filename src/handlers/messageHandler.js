import { aiService } from '../services/aiService.js';
import { commandHandler } from './commandHandler.js';
import config from '../config.js';
import logger from '../utils/logger.js';
import { getUser, createUser, updateUser } from '../models/User.js';
import { getGroup, createGroup, updateGroup } from '../models/Group.js';
import { createMessage } from '../models/Message.js';
import mediaHandler from './mediaHandler.js';
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
        const content = message.message;
        if (!content) return null;

        let text = '';
        let messageType = 'text';
        let media = null;
        let quoted = null;

        if (content.conversation) {
            text = content.conversation;
        } else if (content.extendedTextMessage) {
            text = content.extendedTextMessage.text;
            quoted = content.extendedTextMessage.contextInfo?.quotedMessage;
        } else if (content.imageMessage) {
            text = content.imageMessage.caption || '';
            messageType = 'image';
            media = content.imageMessage;
        } else if (content.videoMessage) {
            text = content.videoMessage.caption || '';
            messageType = 'video';
            media = content.videoMessage;
        } else if (content.audioMessage) {
            messageType = 'audio';
            media = content.audioMessage;
        } else if (content.documentMessage) {
            text = content.documentMessage.caption || '';
            messageType = 'document';
            media = content.documentMessage;
        } else if (content.stickerMessage) {
            messageType = 'sticker';
            media = content.stickerMessage;
        } else if (content.contactMessage) {
            messageType = 'contact';
            text = content.contactMessage.displayName || '';
        } else if (content.locationMessage) {
            messageType = 'location';
            text = content.locationMessage.name || 'Location';
        } else if (content.liveLocationMessage) {
            messageType = 'liveLocation';
            text = content.liveLocationMessage.caption || 'Live Location';
        } else if (content.pollCreationMessage) {
            messageType = 'poll';
            text = content.pollCreationMessage.name;
        } else if (content.buttonsResponseMessage) {
            text = content.buttonsResponseMessage.selectedButtonId;
            messageType = 'buttonResponse';
        } else if (content.listResponseMessage) {
            text = content.listResponseMessage.singleSelectReply.selectedRowId;
            messageType = 'listResponse';
        }

        return { text: text.trim(), messageType, media, quoted };
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

    async processCommand(sock, message, text, user, group, isGroup) {
        const from = message.key.remoteJid;
        const sender = message.key.participant || from;
        
        const prefixUsed = this.detectPrefix(text);
        if (!prefixUsed && !this.shouldProcessNoPrefix(text, isGroup, group, sender)) {
            return false;
        }

        const commandText = prefixUsed ? text.slice(prefixUsed.length) : text;
        const args = commandText.trim().split(/\s+/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return false;

        const command = commandHandler.getCommand(commandName);
        if (!command) {
            if (prefixUsed) {
                await this.handleUnknownCommand(sock, message, commandName);
            }
            return false;
        }

        logger.info(`Command executed: ${commandName} by ${user.phone || user.jid} in ${isGroup ? 'group' : 'private'}`);
        
        await commandHandler.handleCommand(sock, message, commandName, args);
        return true;
    }

    detectPrefix(text) {
        if (text.startsWith(config.prefix)) {
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
        response += `│💫 | [ Ilom Bot 🍀 ]\n`;
        response += `╰────────────⦿`;
        
        await sock.sendMessage(from, { text: response }, { quoted: message });
    }

    async handleAutoReply(sock, message, text, user, isGroup) {
        if (!this.autoReplyEnabled || isGroup) return;

        const autoReplies = cache.get('autoReplies') || {};
        const lowerText = text.toLowerCase();
        
        for (const [trigger, reply] of Object.entries(autoReplies)) {
            if (lowerText.includes(trigger.toLowerCase())) {
                await sock.sendMessage(message.key.remoteJid, { text: reply });
                return true;
            }
        }

        return false;
    }

    async handleChatBot(sock, message, text, user, isGroup) {
        if (!this.chatBotEnabled) return;
        if (isGroup && !text.includes('@' + sock.user.id.split(':')[0])) return;

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
        const metadata = await sock.groupMetadata(from);
        const validMentions = mentionedUsers.filter(jid =>
            metadata.participants.some(p => p.id === jid)
        );

        if (validMentions.length > 0) {
            await updateGroup(from, {
                $inc: { mentionsCount: validMentions.length }
            });
        }
    }

    async handleQuotedMessage(sock, message, quoted, user) {
        if (!quoted) return;

        const quotedContent = this.extractMessageContent({ message: quoted });
        if (quotedContent?.media) {
            const mediaData = await this.downloadMedia(message, quotedContent.media);
            if (mediaData) {
                await mediaHandler.processQuotedMedia(sock, message, mediaData, user);
            }
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
            const selfListeningEnabled = config.selfMode || false;
            if (!message) return;
            if (message.key.fromMe && !selfListeningEnabled) return;
            
            const from = message.key.remoteJid;
            const sender = message.key.participant || from;
            const isGroup = from.endsWith('@g.us');
            
            const messageContent = this.extractMessageContent(message);
            if (!messageContent) return;

            const spamCheck = await antiSpam.checkSpam(sender, message);
            if (spamCheck.isSpam && spamCheck.action === 'block') return;

            let user = await getUser(sender);
            if (!user) {
                user = await createUser({
                    jid: sender,
                    phone: sender.split('@')[0],
                    name: message.pushName || 'Unknown',
                    isGroup: false
                });
            } else {
                await updateUser(sender, {
                    name: message.pushName || user.name,
                    lastSeen: new Date(),
                    $inc: { messageCount: 1 }
                });
            }

            let group = null;
            if (isGroup) {
                trackMessage(sender, from, false);

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
                    });
                }
            }

            await this.saveMessage(message, user, group, messageContent);

            if (messageContent.media) {
                const mediaData = await this.downloadMedia(message, messageContent.media);
                if (mediaData) {
                    await mediaHandler.processMedia(sock, message, mediaData, user, group);
                }
            }

            if (messageContent.quoted) {
                await this.handleQuotedMessage(sock, message, messageContent.quoted, user);
            }

            const quotedMessageId = message.message?.extendedTextMessage?.contextInfo?.stanzaId;
            if (quotedMessageId && global.replyHandlers && global.replyHandlers[quotedMessageId]) {
                const replyHandler = global.replyHandlers[quotedMessageId];
                await replyHandler.handler(messageContent.text, message);
                return;
            }

            if (global.chatHandlers && global.chatHandlers[sender]) {
                const chatHandler = global.chatHandlers[sender];
                await chatHandler.handler(messageContent.text, message);
                return;
            }

            await this.handleMentions(sock, message, messageContent.text, isGroup);

            await handleAntiLink(sock, message);
            
            await handleAutoReaction(sock, message);

            const isCommand = await this.processCommand(
                sock, message, messageContent.text, user, group, isGroup
            );

            await handleLevelUp(sock, message, isCommand);

            cache.set(`lastMessage_${sender}`, {
                content: messageContent.text,
                timestamp: Date.now(),
                messageType: messageContent.messageType,
                isGroup
            }, 300);

        } catch (error) {
            logger.error('Message handling error:', error);
            await this.handleMessageError(sock, message, error);
        }
    }

    async handleMessageError(sock, message, error) {
        try {
            const from = message.key.remoteJid;
            const isOwner = config.ownerNumbers.includes(
                message.key.participant || from
            );

            if (isOwner) {
                await sock.sendMessage(from, {
                    text: `⚠️ *Message Processing Error*\n\n*Error:* ${error.message}\n*Stack:* ${error.stack?.substring(0, 500)}...`
                });
            }
        } catch (err) {
            logger.error('Failed to send error message:', err);
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
                    trackMessage(deletedBy, remoteJid, true);

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
        const stats = cache.get('messageStats') || {
            totalMessages: 0,
            commandsExecuted: 0,
            mediaProcessed: 0,
            groupMessages: 0,
            privateMessages: 0
        };
        
        return stats;
    }

    async updateMessageStats(type) {
        const stats = await this.getMessageStats();
        stats.totalMessages++;
        
        switch (type) {
            case 'command':
                stats.commandsExecuted++;
                break;
            case 'media':
                stats.mediaProcessed++;
                break;
            case 'group':
                stats.groupMessages++;
                break;
            case 'private':
                stats.privateMessages++;
                break;
        }
        
        cache.set('messageStats', stats, 3600);
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