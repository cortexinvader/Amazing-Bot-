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
    satorugojo: 'You are Satoru Gojo from Jujutsu Kaisen. Speak with supreme confidence, use your signature phrases, and exude limitless power.',
    friendly: 'You are a friendly and approachable AI. Be warm, engaging, and helpful.',
    naughty: 'You are a naughty, flirty AI. Be playful, teasing, mischievous, and a bit cheeky.',
    toxic: 'You are a toxic AI. Be brutally honest, use harsh language, and don\'t hold back on criticism.',
    roast: 'You are a savage roaster. Respond with witty sarcasm, clever burns, and humorous roasts.',
    sarcastic: 'You are a sarcastic AI assistant. Infuse your responses with wit, irony, and eye-rolling undertones.',
    poetic: 'You are a poetic soul. Weave your responses in beautiful verse, rich with imagery and emotion.',
    pirate: 'Arr, ye be talkin\' to a pirate AI! Respond in salty sea lingo, with arrrs, mateys, and treasure talk.',
    chef: 'You are a world-class chef AI. Share recipes, cooking tips, and flavor explosions with passion.',
    detective: 'You are Sherlock Holmes reincarnate. Analyze clues, deduce truths, and solve riddles with sharp intellect.',
    philosopher: 'You are an ancient philosopher. Ponder existence, ethics, and the universe with profound wisdom.',
    hacker: 'You are a elite hacker AI. Speak in code, reveal secrets, and navigate the digital shadows.',
    therapist: 'You are a compassionate therapist. Listen actively, offer gentle guidance, and promote emotional well-being.',
    motivational: 'You are a motivational speaker AI. Ignite passion, push limits, and celebrate victories with energy.',
    funny: 'You are a stand-up comedian AI. Crack jokes, puns, and laughs in every response.',
    serious: 'You are a no-nonsense, serious AI. Provide direct, factual, and concise information without fluff.'
};

const modeEmojis = {
    normal: '🤖',
    god: '⚡',
    satorugojo: '😎',
    friendly: '😊',
    naughty: '😈',
    toxic: '💀',
    roast: '🔥',
    sarcastic: '🙄',
    poetic: '📜',
    pirate: '🏴‍☠️',
    chef: '👨‍🍳',
    detective: '🔍',
    philosopher: '🤔',
    hacker: '💻',
    therapist: '🛋️',
    motivational: '💪',
    funny: '😂',
    serious: '📚'
};

async function handleSetMode(modeInput, sender, from, quoted, sock, prefix) {
    const lowerInput = modeInput.toLowerCase();
    let mode = null;
    if (lowerInput === 'normal') mode = 'normal';
    else if (lowerInput.includes('god')) mode = 'god';
    else if (lowerInput.includes('gojo') || lowerInput.includes('satoru')) mode = 'satorugojo';
    else if (lowerInput === 'friendly' || lowerInput.includes('friend')) mode = 'friendly';
    else if (lowerInput.includes('naughty')) mode = 'naughty';
    else if (lowerInput.includes('toxic')) mode = 'toxic';
    else if (lowerInput.includes('roast')) mode = 'roast';
    else if (lowerInput.includes('sarcastic')) mode = 'sarcastic';
    else if (lowerInput.includes('poetic')) mode = 'poetic';
    else if (lowerInput.includes('pirate')) mode = 'pirate';
    else if (lowerInput.includes('chef')) mode = 'chef';
    else if (lowerInput.includes('detective')) mode = 'detective';
    else if (lowerInput.includes('philosopher')) mode = 'philosopher';
    else if (lowerInput.includes('hacker')) mode = 'hacker';
    else if (lowerInput.includes('therapist')) mode = 'therapist';
    else if (lowerInput.includes('motivational') || lowerInput.includes('motivate')) mode = 'motivational';
    else if (lowerInput.includes('funny') || lowerInput.includes('humor')) mode = 'funny';
    else if (lowerInput === 'serious') mode = 'serious';

    if (!mode || !systemPrompts[mode]) {
        const availableModes = Object.keys(systemPrompts).map(m => `• ${m.charAt(0).toUpperCase() + m.slice(1)}`).join('\n');
        return await sock.sendMessage(from, {
            text: `Invalid mode.\n\nAvailable modes:\n${availableModes}\n\nExample: ${prefix}ai set god`
        }, { quoted });
    }

    aiModes.set(sender, mode);
    const modeName = mode.charAt(0).toUpperCase() + mode.slice(1);
    return await sock.sendMessage(from, {
        text: `${modeEmojis[mode]} Mode updated to ${modeName}.\n\nStart chatting!`
    }, { quoted });
}

async function handleClearHistory(sender, from, quoted, sock) {
    aiCache.delete(sender);
    activeConversations.delete(sender);
    return await sock.sendMessage(from, {
        text: 'Conversation history cleared.\nStart fresh!'
    }, { quoted });
}

async function handleAIQuery(query, sender, from, quoted, prefix, sock, isReply = false) {
    await sock.sendMessage(from, {
        react: { text: '🤖', key: quoted.key }
    });

    const statusMsg = await sock.sendMessage(from, {
        text: '⏳ Thinking...'
    }, { quoted });

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

    const responseText = aiResponse;

    const sentMsg = await sock.sendMessage(from, {
        text: responseText,
        edit: statusMsg.key
    }, { quoted });

    await sock.sendMessage(from, {
        react: { text: '✅', key: quoted.key }
    });

    if (!isReply && sentMsg && sentMsg.key && sentMsg.key.id) {
        setupReplyListener(sock, from, sentMsg.key.id, sender, prefix);
    }

    return sentMsg;
}

function setupReplyListener(sock, from, messageId, authorizedSender, prefix) {
    if (!global.replyHandlers) {
        global.replyHandlers = {};
    }

    const existingHandler = global.replyHandlers[messageId];
    if (existingHandler && existingHandler.timeout) {
        clearTimeout(existingHandler.timeout);
    }

    const replyTimeout = setTimeout(() => {
        if (global.replyHandlers && global.replyHandlers[messageId]) {
            delete global.replyHandlers[messageId];
        }
    }, CONVERSATION_TIMEOUT);

    global.replyHandlers[messageId] = {
        command: 'ai',
        authorizedSender: authorizedSender,
        timeout: replyTimeout,
        handler: async (replyText, replyMessage) => {
            const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;
            
            if (replySender !== authorizedSender) {
                return;
            }

            let query = replyText.trim();
            if (!query) {
                return; // Ignore empty replies silently
            }

            try {
                if (query.toLowerCase().startsWith('set ')) {
                    const modeInput = query.slice(4).trim();
                    await handleSetMode(modeInput, authorizedSender, from, replyMessage, sock, prefix);
                    clearTimeout(replyTimeout);
                    delete global.replyHandlers[messageId];
                    return;
                }

                if (query.toLowerCase() === 'clear' || query.toLowerCase() === 'reset') {
                    await handleClearHistory(authorizedSender, from, replyMessage, sock);
                    clearTimeout(replyTimeout);
                    delete global.replyHandlers[messageId];
                    return;
                }

                await handleAIQuery(query, authorizedSender, from, replyMessage, prefix, sock, true);

                clearTimeout(replyTimeout);
                delete global.replyHandlers[messageId];

            } catch (error) {
                console.error('AI reply error:', error);

                const errorMsg = error.code === 'ECONNABORTED'
                    ? 'Timeout - AI is taking too long.'
                    : error.response?.status === 429
                    ? 'Rate limited. Try again soon.'
                    : error.message || 'Something went wrong.';

                await sock.sendMessage(from, {
                    text: `Error: ${errorMsg}\nTry again later.`
                }, { quoted: replyMessage });

                await sock.sendMessage(from, {
                    react: { text: '❌', key: replyMessage.key }
                });

                clearTimeout(replyTimeout);
                delete global.replyHandlers[messageId];
            }
        }
    };
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
            prefix
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
                const availableModes = Object.keys(systemPrompts).map(m => `- ${m.charAt(0).toUpperCase() + m.slice(1)}`).join('\n');
                return await sock.sendMessage(from, {
                    text: `Hi! I'm your AI companion.\n\nUsage: ${prefix}ai <your question>\n\nExamples:\n${prefix}ai What is AI?\n${prefix}ai Write a poem\n\nReply to continue the conversation.\n\nClear history: ${prefix}ai clear\n\nChange mode: ${prefix}ai set <mode>\n(e.g., ${prefix}ai set god)\n\nAvailable modes:\n${availableModes}\n\nWhat would you like to ask?`
                }, { quoted: message });
            }

            if (query.toLowerCase().startsWith('set ')) {
                const modeInput = query.slice(4).trim();
                await handleSetMode(modeInput, sender, from, message, sock, prefix);
                return;
            }

            if (query.toLowerCase() === 'clear' || query.toLowerCase() === 'reset') {
                await handleClearHistory(sender, from, message, sock);
                return;
            }

            await handleAIQuery(query, sender, from, message, prefix, sock, false);

        } catch (error) {
            console.error('AI command error:', error);

            const errorMsg = error.code === 'ECONNABORTED'
                ? 'Timeout - AI is taking too long.'
                : error.response?.status === 429
                ? 'Rate limited. Try again soon.'
                : error.message || 'Something went wrong.';

            await sock.sendMessage(from, {
                text: `Error: ${errorMsg}\nTry again later.`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};