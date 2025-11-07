import axios from 'axios';

export default {
    name: 'bibleai',
    aliases: ['biblegpt'],
    category: 'ai',
    description: 'Chat with BibleGPT AI model.',
    usage: 'bible <prompt>',
    example: 'bible What does the Bible say about love?',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    maxArgs: Infinity,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, from }) {
        const prompt = args.join(' ');

        if (!prompt.trim()) {
            return await sock.sendMessage(from, {
                text: '❗ Please provide a prompt for BibleGPT.'
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

            const apiUrl = `https://arychauhann.onrender.com/api/biblegpt?prompt=${encodeURIComponent(prompt)}`;

            const response = await axios.get(apiUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const data = response.data;

            // Assuming API returns plain text or {response: 'text'}
            let aiResponse = typeof data === 'string' ? data : (data.response || data.text || 'No response');

            const output = `📖 *BibleGPT Response:*\n\n${aiResponse}`;

            await sock.sendMessage(from, {
                text: output
            }, { quoted: message });

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

        } catch (err) {
            console.error('BibleGPT command error:', err);
            await sock.sendMessage(from, {
                text: `❌ BibleGPT failed: ${err.message}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};