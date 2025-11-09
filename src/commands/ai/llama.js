import axios from 'axios';

export default {
    name: 'llama2',
    aliases: ['llama'],
    category: 'ai',
    description: 'Chat with Llama 2 AI model',
    usage: 'llama2 <prompt>',
    example: 'llama2 What is AI?',
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
            return sock.sendMessage(from, { text: 'Please provide a prompt for Llama 2.' }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '🤖', key: message.key } });

            const response = await axios.get(`https://arychauhann.onrender.com/api/llama2?prompt=${encodeURIComponent(prompt)}`, {
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const data = response.data;
            let aiResponse = data.result || data.response || data.text || 'No response from Llama 2.';

            if (aiResponse === 'No response from Llama 2.') {
                throw new Error('Empty response');
            }

            await sock.sendMessage(from, {
                text: aiResponse
            }, { quoted: message });

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

        } catch (error) {
            console.error('Llama2 error:', error);
            await sock.sendMessage(from, {
                text: 'Error: Could not get response from Llama 2. The endpoint might be unavailable.'
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};