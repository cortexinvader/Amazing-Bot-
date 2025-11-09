import axios from 'axios';

export default {
    name: 'deepseek',
    aliases: ['deepseek3'],
    category: 'ai',
    description: 'Chat with DeepSeek 3 AI model',
    usage: 'deepseek <prompt>',
    example: 'deepseek Explain quantum computing',
    cooldown: 3,
    permissions: ['user'],
    args: true,
    minArgs: 0,
    maxArgs: Infinity,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute(options) {
        const { sock, message, args, from } = options;
        let prompt = args.join(' ').trim();

        if (!prompt) {
            return sock.sendMessage(from, { text: 'Please provide a prompt for DeepSeek.' }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '🧠', key: message.key } });

            const response = await axios.get(`https://arychauhann.onrender.com/api/deepseek3?prompt=${encodeURIComponent(prompt)}`, {
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const data = response.data;
            let aiResponse = data.result || data.response || data.text || 'No response from DeepSeek.';

            if (aiResponse === 'No response from DeepSeek.') {
                throw new Error('Empty response');
            }

            await sock.sendMessage(from, {
                text: aiResponse
            }, { quoted: message });

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

        } catch (error) {
            console.error('DeepSeek error:', error);
            await sock.sendMessage(from, {
                text: 'Error: Could not get response from DeepSeek.'
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};