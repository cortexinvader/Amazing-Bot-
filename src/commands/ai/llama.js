import axios from 'axios';
import config from '../../config.js';

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
    name: 'llama2',
    aliases: ['llama', 'llm2'],
    category: 'ai',
    description: 'Chat with Llama 2 AI',
    usage: 'llama2 <query>',
    example: 'llama2 What is quantum physics?',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
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

            // Handle quoted message if no direct query
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
                    text: `Usage: ${prefix}llama2 <your question>\n\nExample: ${prefix}llama2 What is AI?`
                }, { quoted: message });
            }

            // React to user's message
            await sock.sendMessage(from, {
                react: { text: '🤖', key: message.key }
            });

            // Send processing message
            const statusMsg = await sock.sendMessage(from, {
                text: '⏳ Processing your query with Llama 2...'
            }, { quoted: message });

            // API call
            const apiUrl = `https://arychauhann.onrender.com/api/llama2?prompt=${encodeURIComponent(query)}`;
            const { data } = await axios.get(apiUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            let aiResponse = data.response ||
                             data.content ||
                             data.reply ||
                             data.answer ||
                             data.text ||
                             data.prompt_response ||
                             'No response received';

            if (!aiResponse || aiResponse === 'No response received') {
                throw new Error('Empty response from Llama 2');
            }

            // Clean the AI response
            aiResponse = cleanResponse(aiResponse);

            // Edit the status message
            await sock.sendMessage(from, {
                text: aiResponse,
                edit: statusMsg.key
            }, { quoted: message });

            // Success react
            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Llama2 command error:', error);

            const errorMsg = error.code === 'ECONNABORTED'
                ? 'Request timeout - AI took too long to respond'
                : error.response?.status === 429
                ? 'Rate limit exceeded - try again in a moment'
                : error.message || 'Unknown error occurred';

            await sock.sendMessage(from, {
                text: `Failed to get Llama 2 response\n\nError: ${errorMsg}\nTry again in a moment`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};