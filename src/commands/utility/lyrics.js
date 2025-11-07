import axios from 'axios';

export default {
    name: 'lyrics',
    aliases: ['lyric', 'song'],
    category: 'utility',
    description: 'Search and get song lyrics.',
    usage: 'lyrics <song name>',
    example: 'lyrics Baby',
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
        const query = args.join(' ');

        if (!query.trim()) {
            return await sock.sendMessage(from, {
                text: '❗ Please provide a song name or lyrics query.'
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

            const apiUrl = `https://arychauhann.onrender.com/api/lrclib?query=${encodeURIComponent(query)}`;

            const response = await axios.get(apiUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const data = response.data;

            // Assuming API returns { lyrics: 'full lyrics text', title: '...', artist: '...' }
            // Adjust if actual structure differs
            if (!data || !data.lyrics) {
                throw new Error('No lyrics found for the query');
            }

            const lyricsText = `🎵 *${data.title || query}* by ${data.artist || 'Unknown'}\n\n` +
                               `${data.lyrics || 'Lyrics not available'}\n\n` +
                               `💡 Powered by LrcLib API`;

            await sock.sendMessage(from, {
                text: lyricsText
            }, { quoted: message });

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

        } catch (err) {
            console.error('Lyrics command error:', err);
            await sock.sendMessage(from, {
                text: `❌ Failed to fetch lyrics: ${err.message}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};