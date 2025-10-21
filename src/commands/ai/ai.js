import axios from 'axios';
import config from '../../config.js';

const aiCache = new Map();
const AI_CONTEXT_LIMIT = 10;
const AI_TIMEOUT = 30000;

export default {
    name: 'ai',
    aliases: ['chat', 'gpt', 'openai', 'ask'],
    category: 'ai',
    description: 'Chat with Blackbox AI - maintains conversation context',
    usage: 'ai <query>',
    example: 'ai What is quantum physics?\nai explain that in simple terms',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: true,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, from, sender, prefix, isOwner }) {
        try {
            let query = args.join(' ').trim();

            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quotedMsg && !query) {
                const quotedText = quotedMsg.conversation || 
                                 quotedMsg.extendedTextMessage?.text || 
                                 quotedMsg.imageMessage?.caption || 
                                 quotedMsg.videoMessage?.caption || '';
                
                if (quotedText) {
                    query = quotedText;
                }
            }

            if (!query) {
                return await sock.sendMessage(from, {
                    text: `Usage: ${prefix}ai <your question>\n\nExamples:\n${prefix}ai What is AI?\n${prefix}ai Write a poem\n${prefix}ai Explain quantum physics\n\nContext: Reply to AI messages to continue conversation with full context\n\nClear History: ${prefix}ai clear`
                }, { quoted: message });
            }

            if (query.toLowerCase() === 'clear' || query.toLowerCase() === 'reset') {
                aiCache.delete(sender);
                return await sock.sendMessage(from, {
                    text: 'Conversation history cleared! Start fresh with a new query.'
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '🤖', key: message.key }
            });

            const statusMsg = await sock.sendMessage(from, {
                text: 'Processing your query...'
            }, { quoted: message });

            if (!aiCache.has(sender)) {
                aiCache.set(sender, []);
            }

            let history = aiCache.get(sender);
            const recentHistory = history.slice(-AI_CONTEXT_LIMIT);

            let conversationContext = '';
            if (recentHistory.length > 0) {
                conversationContext = recentHistory.map(msg => 
                    `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
                ).join('\n') + '\n';
            }

            const fullPrompt = conversationContext + `Human: ${query}\nAssistant:`;

            const apiUrl = `https://ab-blackboxai.abrahamdw882.workers.dev/?q=${encodeURIComponent(fullPrompt)}`;
            
            const { data } = await axios.get(apiUrl, { 
                timeout: AI_TIMEOUT,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            const aiResponse = data.content || 
                             data.response || 
                             data.reply || 
                             data.answer || 
                             data.text || 
                             'No response received';

            if (!aiResponse || aiResponse === 'No response received') {
                throw new Error('Empty response from AI');
            }

            history.push({ role: 'user', content: query });
            history.push({ role: 'assistant', content: aiResponse });

            if (history.length > AI_CONTEXT_LIMIT * 2) {
                history = history.slice(-AI_CONTEXT_LIMIT * 2);
            }
            aiCache.set(sender, history);

            const contextInfo = history.length > 2 ? `\n\nContext: ${Math.floor(history.length / 2)} messages` : '';
            
            let responseText = aiResponse + contextInfo + `\n\nReply to continue conversation\nUse ${prefix}ai clear to reset`;

            const sentMsg = await sock.sendMessage(from, {
                text: responseText
            }, { quoted: message });

            if (sentMsg && sentMsg.key) {
                this.setupReplyHandler(sock, from, sentMsg.key.id, sender, prefix);
            }

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('AI command error:', error);
            
            const errorMsg = error.code === 'ECONNABORTED' 
                ? 'Request timeout - AI took too long to respond'
                : error.response?.status === 429
                ? 'Rate limit exceeded - try again in a moment'
                : error.message || 'Unknown error occurred';

            await sock.sendMessage(from, {
                text: `Failed to get AI response\n\nError: ${errorMsg}\nTry again in a moment`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    },

    setupReplyHandler(sock, from, messageId, sender, prefix) {
        const replyTimeout = setTimeout(() => {
            if (global.replyHandlers && global.replyHandlers[messageId]) {
                delete global.replyHandlers[messageId];
            }
        }, 300000);

        if (!global.replyHandlers) {
            global.replyHandlers = {};
        }

        global.replyHandlers[messageId] = {
            command: this.name,
            timeout: replyTimeout,
            handler: async (replyText, replyMessage) => {
                const query = replyText.trim();

                if (!query) {
                    await sock.sendMessage(from, {
                        text: 'Please provide a query'
                    }, { quoted: replyMessage });
                    return;
                }

                const args = query.split(' ');
                await this.execute({ 
                    sock, 
                    message: replyMessage, 
                    args, 
                    from, 
                    sender, 
                    prefix 
                });

                clearTimeout(replyTimeout);
                delete global.replyHandlers[messageId];
            }
        };
    }
};