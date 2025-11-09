import axios from 'axios';

export default {
    name: 'bibleai',
    aliases: ['bible', biblegpt],
    category: 'ai',
    description: 'Chat with BibleGPT AI (Bible-themed responses)',
    usage: 'biblegpt <prompt>',
    example: 'biblegpt What does the Bible say about love?',
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
            return sock.sendMessage(from, { text: 'Please provide a prompt for BibleGPT.' }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '📖', key: message.key } });

            const response = await axios.get(`https://arychauhann.onrender.com/api/biblegpt?prompt=${encodeURIComponent(prompt)}`, {
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const data = response.data;
            let aiResponse = data.result || data.response || data.text || 'No response from BibleGPT.';

            if (aiResponse === 'No response from BibleGPT.') {
                throw new Error('Empty response');
            }

            await sock.sendMessage(from, {
                text: aiResponse
            }, { quoted: message });

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

        } catch (error) {
            console.error('BibleGPT error:', error);
            await sock.sendMessage(from, {
                text: 'Error: Could not get response from BibleGPT.'
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};