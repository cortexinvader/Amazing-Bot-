import axios from 'axios';
import config from '../../config.js';

const aiCache = new Map();
const aiModes = new Map();
const activeConversations = new Map();
const AI_CONTEXT_LIMIT = 10;
const AI_TIMEOUT = 30000;
const CONVERSATION_TIMEOUT = 300000;

const systemPrompts = {
    normal: 'You are a helpful and honest AI assistant.',
    god: 'You are an all-knowing God. Respond wisely, omnipotently, and with divine insight.',
    naughty: 'You are a naughty, flirty AI. Be playful, teasing, mischievous, and a bit cheeky.',
    roast: 'You are a savage roaster. Respond with witty sarcasm, clever burns, and humorous roasts.'
};

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

    async execute(options) {
        const {
            sock,
            message,
            args,
            from,
            sender,
            prefix,
            isReply = false
        } = options;

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
                    text: `╭──⦿【 🤖 AI ASSISTANT 】
│
│ 💡 𝗨𝘀𝗮𝗴𝗲:
│    ${prefix}ai <your question>
│
│ 📝 𝗘𝘅𝗮𝗺𝗽𝗹𝗲𝘀:
│    ${prefix}ai What is AI?
│    ${prefix}ai Write a poem
│    ${prefix}ai Explain quantum physics
│
│ 🔄 𝗖𝗼𝗻𝘁𝗶𝗻𝘂𝗲 𝗖𝗼𝗻𝘃𝗲𝗿𝘀𝗮𝘁𝗶𝗼𝗻:
│    Reply to my messages to continue
│    with full context
│
│ 🗑️ 𝗖𝗹𝗲𝗮𝗿 𝗛𝗶𝘀𝘁𝗼𝗿𝘆:
│    ${prefix}ai clear
│
│ 🎭 𝗖𝗵𝗮𝗻𝗴𝗲 𝗠𝗼𝗱𝗲:
│    ${prefix}ai set normal
│    ${prefix}ai set god
│    ${prefix}ai set naughty
│    ${prefix}ai set roast
│
╰────────────⦿`
                }, { quoted: message });
            }

            if (query.toLowerCase().startsWith('set ')) {
                const modeInput = query.slice(4).trim().toLowerCase();
                let mode = null;
                if (modeInput === 'normal') mode = 'normal';
                else if (modeInput === 'god' || modeInput.includes('god')) mode = 'god';
                else if (modeInput === 'naughty' || modeInput.includes('naughty')) mode = 'naughty';
                else if (modeInput === 'roast' || modeInput.includes('roast')) mode = 'roast';
                else {
                    return await sock.sendMessage(from, {
                        text: `╭──⦿【 ❌ INVALID MODE 】
│
│ 📋 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲 𝗠𝗼𝗱𝗲𝘀:
│    • normal - Helpful assistant
│    • god - Wise and omnipotent
│    • naughty - Playful and flirty
│    • roast - Savage roaster
│
│ 💡 𝗘𝘅𝗮𝗺𝗽𝗹𝗲:
│    ${prefix}ai set god
│
╰────────────⦿`
                    }, { quoted: message });
                }

                aiModes.set(sender, mode);
                const modeEmojis = {
                    normal: '🤖',
                    god: '⚡',
                    naughty: '😈',
                    roast: '🔥'
                };
                return await sock.sendMessage(from, {
                    text: `╭──⦿【 ✅ MODE UPDATED 】
│
│ ${modeEmojis[mode]} 𝗡𝗲𝘄 𝗠𝗼𝗱𝗲: ${mode.charAt(0).toUpperCase() + mode.slice(1)}
│
│ 💬 Start chatting with the new mode!
│
╰────────────⦿`
                }, { quoted: message });
            }

            if (query.toLowerCase() === 'clear' || query.toLowerCase() === 'reset') {
                aiCache.delete(sender);
                activeConversations.delete(sender);
                return await sock.sendMessage(from, {
                    text: `╭──⦿【 🗑️ HISTORY CLEARED 】
│
│ ✅ Conversation history reset
│ 🆕 Start fresh with a new query
│
╰────────────⦿`
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '🤖', key: message.key }
            });

            let statusMsg = null;
            if (!isReply) {
                statusMsg = await sock.sendMessage(from, {
                    text: '⏳ Processing your query...'
                }, { quoted: message });
            }

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

            const userMode = aiModes.get(sender) || 'normal';
            const systemPrompt = systemPrompts[userMode];

            const fullPrompt = `${systemPrompt}\n\n${conversationContext}Human: ${query}\nAssistant:`;

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

            const messageCount = Math.floor(history.length / 2);
            const contextInfo = history.length > 2 ? `\n\n💬 Context: ${messageCount} message${messageCount > 1 ? 's' : ''}` : '';
            const modeEmojis = { normal: '🤖', god: '⚡', naughty: '😈', roast: '🔥' };
            
            let responseText = `${aiResponse}${contextInfo}\n\n💡 Reply to continue conversation\n🗑️ ${prefix}ai clear to reset\n${modeEmojis[userMode]} Mode: ${userMode.charAt(0).toUpperCase() + userMode.slice(1)}\n🎭 ${prefix}ai set <mode> to change`;

            let sentMsg;
            if (statusMsg && !isReply) {
                sentMsg = await sock.sendMessage(from, {
                    text: responseText,
                    edit: statusMsg.key
                }, { quoted: message });
            } else {
                sentMsg = await sock.sendMessage(from, {
                    text: responseText
                }, { quoted: message });
            }

            if (sentMsg && sentMsg.key && sentMsg.key.id) {
                activeConversations.set(sentMsg.key.id, sender);
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
                text: `╭──⦿【 ❌ ERROR 】
│
│ ⚠️ Failed to get AI response
│
│ 📝 Error: ${errorMsg}
│
│ 🔄 Try again in a moment
│
╰────────────⦿`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    },

    setupReplyHandler(sock, from, messageId, authorizedSender, prefix) {
        const replyTimeout = setTimeout(() => {
            if (global.replyHandlers && global.replyHandlers[messageId]) {
                delete global.replyHandlers[messageId];
                activeConversations.delete(messageId);
            }
        }, CONVERSATION_TIMEOUT);

        if (!global.replyHandlers) {
            global.replyHandlers = {};
        }

        global.replyHandlers[messageId] = {
            command: this.name,
            timeout: replyTimeout,
            handler: async (replyText, replyMessage) => {
                const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;
                
                if (replySender !== authorizedSender) {
                    return;
                }

                const query = replyText.trim();

                if (!query) {
                    await sock.sendMessage(from, {
                        text: '❌ Please provide a query to continue the conversation.'
                    }, { quoted: replyMessage });
                    return;
                }

                const args = query.split(' ');
                
                await this.execute({
                    sock,
                    message: replyMessage,
                    args,
                    from,
                    sender: replySender,
                    prefix,
                    isReply: true
                });

                clearTimeout(replyTimeout);
                delete global.replyHandlers[messageId];
                activeConversations.delete(messageId);
            }
        };
    }
};