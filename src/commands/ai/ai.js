import axios from 'axios';
import config from '../../config.js';

const aiCache = new Map();
const aiModes = new Map();
const AI_CONTEXT_LIMIT = 10;
const AI_TIMEOUT = 30000;
const CONVERSATION_TIMEOUT = 300000;

const systemPrompts = {
    normal: 'You are a helpful and honest AI assistant.',
    god: 'You are an all-knowing God. Respond wisely, omnipotently, and with divine insight.',
    naughty: 'You are a naughty, flirty AI. Be playful, teasing, mischievous, and a bit cheeky.',
    roast: 'You are a savage roaster. Respond with witty sarcasm, clever burns, and humorous roasts.'
};

function cleanResponse(text) {
    // Remove code block formatting to flatten output (removes boxes in WhatsApp)
    return text.replace(/```[\s\S]*?```/g, (match) => {
        const lines = match.split('\n');
        // Remove first (```lang) and last (```) lines, join the rest
        const content = lines.slice(1, -1).join('\n').trim();
        return content || '';
    });
}

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

            // Handle quoted message if no direct query (only for non-reply continuations)
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quotedMsg && !query && !isReply) {
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
                    text: `Usage: ${prefix}ai <your question>\n\nExamples:\n${prefix}ai What is AI?\n${prefix}ai Write a poem\n${prefix}ai Explain quantum physics\n\nContext: Reply to AI messages to continue conversation with full context\n\nClear History: ${prefix}ai clear\n\nModes: ${prefix}ai set normal | god | naughty | roast`
                }, { quoted: message });
            }

            // Handle mode setting
            if (query.toLowerCase().startsWith('set ')) {
                const modeInput = query.slice(4).trim().toLowerCase();
                let mode = null;
                if (modeInput === 'normal') mode = 'normal';
                else if (modeInput === 'god' || modeInput.includes('god')) mode = 'god';
                else if (modeInput === 'naughty' || modeInput.includes('naughty')) mode = 'naughty';
                else if (modeInput === 'roast' || modeInput.includes('roast')) mode = 'roast';
                else {
                    return await sock.sendMessage(from, {
                        text: `Invalid mode. Available: normal, god, naughty, roast\n\nExample: ${prefix}ai set god`
                    }, { quoted: message });
                }

                aiModes.set(sender, mode);
                const modeEmojis = { normal: '🤖', god: '⚡', naughty: '😈', roast: '🔥' };
                return await sock.sendMessage(from, {
                    text: `${modeEmojis[mode]} AI mode set to: ${mode.charAt(0).toUpperCase() + mode.slice(1)} mode!`
                }, { quoted: message });
            }

            // Handle clear/reset
            if (query.toLowerCase() === 'clear' || query.toLowerCase() === 'reset') {
                aiCache.delete(sender);
                return await sock.sendMessage(from, {
                    text: 'Conversation history cleared! Start fresh with a new query.'
                }, { quoted: message });
            }

            // React to user's message
            await sock.sendMessage(from, {
                react: { text: '🤖', key: message.key }
            });

            // Always send processing message (for both initial and replies, like the first version)
            const statusMsg = await sock.sendMessage(from, {
                text: '⏳ Processing your query...'
            }, { quoted: message });

            // Initialize or get history
            if (!aiCache.has(sender)) {
                aiCache.set(sender, []);
            }
            let history = aiCache.get(sender);
            const recentHistory = history.slice(-AI_CONTEXT_LIMIT);

            // Build conversation context
            let conversationContext = '';
            if (recentHistory.length > 0) {
                conversationContext = recentHistory.map(msg =>
                    `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
                ).join('\n') + '\n';
            }

            // Get current mode and system prompt
            const userMode = aiModes.get(sender) || 'normal';
            const systemPrompt = systemPrompts[userMode];

            // Full prompt
            const fullPrompt = `${systemPrompt}\n\n${conversationContext}Human: ${query}\nAssistant:`;

            // API call
            const apiUrl = `https://ab-blackboxai.abrahamdw882.workers.dev/?q=${encodeURIComponent(fullPrompt)}`;
            const { data } = await axios.get(apiUrl, {
                timeout: AI_TIMEOUT,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            let aiResponse = data.content ||
                             data.response ||
                             data.reply ||
                             data.answer ||
                             data.text ||
                             'No response received';

            if (!aiResponse || aiResponse === 'No response received') {
                throw new Error('Empty response from AI');
            }

            // Clean the AI response to remove markdown code blocks (flattens boxes)
            aiResponse = cleanResponse(aiResponse);

            // Update history
            history.push({ role: 'user', content: query });
            history.push({ role: 'assistant', content: aiResponse });

            if (history.length > AI_CONTEXT_LIMIT * 2) {
                history = history.slice(-AI_CONTEXT_LIMIT * 2);
            }
            aiCache.set(sender, history);

            // Response text (reduced formatting to avoid visual clutter)
            const messageCount = Math.floor(history.length / 2);
            const contextInfo = history.length > 2 ? `\n\n💬 Context: ${messageCount} message${messageCount > 1 ? 's' : ''}` : '';
            const modeEmojis = { normal: '🤖', god: '⚡', naughty: '😈', roast: '🔥' };
            const responseText = `${aiResponse}${contextInfo}\n\n💡 Reply to continue conversation\n🗑️ ${prefix}ai clear to reset\n${modeEmojis[userMode]} Mode: ${userMode.charAt(0).toUpperCase() + userMode.slice(1)}\n🎭 ${prefix}ai set <mode> to change`;

            // Always edit the status message
            const sentMsg = await sock.sendMessage(from, {
                text: responseText,
                edit: statusMsg.key
            }, { quoted: message });

            // Setup reply handler for future continuations (ensures prefix-less replies work via global handler)
            if (sentMsg && sentMsg.key && sentMsg.key.id) {
                this.setupReplyHandler(sock, from, sentMsg.key.id, sender, prefix);
            }

            // Success react
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

    setupReplyHandler(sock, from, messageId, authorizedSender, prefix) {
        // Clear any existing handler for this message ID
        if (global.replyHandlers && global.replyHandlers[messageId]) {
            clearTimeout(global.replyHandlers[messageId].timeout);
            delete global.replyHandlers[messageId];
        }

        // Timeout for reply handler
        const replyTimeout = setTimeout(() => {
            if (global.replyHandlers && global.replyHandlers[messageId]) {
                delete global.replyHandlers[messageId];
            }
        }, CONVERSATION_TIMEOUT);

        if (!global.replyHandlers) {
            global.replyHandlers = {};
        }

        global.replyHandlers[messageId] = {
            command: this.name,
            authorizedSender: authorizedSender,
            timeout: replyTimeout,
            handler: async (replyText, replyMessage) => {
                // Check if reply is from authorized sender (like the first version)
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

                // Handle clear/reset in handler (like first version, for optimization)
                if (query.toLowerCase() === 'clear' || query.toLowerCase() === 'reset') {
                    aiCache.delete(authorizedSender);
                    await sock.sendMessage(from, {
                        text: '🗑️ Conversation history cleared! Start fresh with a new query.'
                    }, { quoted: replyMessage });
                    clearTimeout(replyTimeout);
                    delete global.replyHandlers[messageId];
                    return;
                }

                // Handle mode setting in handler (like first version)
                if (query.toLowerCase().startsWith('set ')) {
                    const modeInput = query.slice(4).trim().toLowerCase();
                    let mode = null;
                    if (modeInput === 'normal') mode = 'normal';
                    else if (modeInput === 'god' || modeInput.includes('god')) mode = 'god';
                    else if (modeInput === 'naughty' || modeInput.includes('naughty')) mode = 'naughty';
                    else if (modeInput === 'roast' || modeInput.includes('roast')) mode = 'roast';
                    
                    if (mode) {
                        aiModes.set(authorizedSender, mode);
                        const modeEmojis = { normal: '🤖', god: '⚡', naughty: '😈', roast: '🔥' };
                        await sock.sendMessage(from, {
                            text: `${modeEmojis[mode]} AI mode set to: ${mode.charAt(0).toUpperCase() + mode.slice(1)} mode!`
                        }, { quoted: replyMessage });
                        clearTimeout(replyTimeout);
                        delete global.replyHandlers[messageId];
                        return;
                    } else {
                        await sock.sendMessage(from, {
                            text: `Invalid mode. Available: normal, god, naughty, roast\n\nExample: ${prefix}ai set god`
                        }, { quoted: replyMessage });
                        clearTimeout(replyTimeout);
                        delete global.replyHandlers[messageId];
                        return;
                    }
                }

                // For regular queries, call execute as reply (no duplication)
                const args = [query]; // Pass as single arg to preserve full query
                await this.execute({
                    sock,
                    message: replyMessage,
                    args,
                    from,
                    sender: authorizedSender,
                    prefix,
                    isReply: true
                });

                // Clean up old handler after processing
                clearTimeout(replyTimeout);
                delete global.replyHandlers[messageId];
            }
        };
    }
};