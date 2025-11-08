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
    name: 'lyrics',
    aliases: ['lyric'],
    category: 'utility',
    description: 'Get lyrics for a song',
    usage: 'lyrics <song name>',
    example: 'lyrics Baby',
    cooldown: 3,
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
            const query = args.join(' ').trim();

            if (!query) {
                return await sock.sendMessage(from, {
                    text: `Usage: ${prefix}lyrics <song name>\n\nExample: ${prefix}lyrics shape of you`
                }, { quoted: message });
            }

            // React to user's message
            await sock.sendMessage(from, {
                react: { text: '🎵', key: message.key }
            });

            // Send processing message
            const statusMsg = await sock.sendMessage(from, {
                text: '⏳ Searching for lyrics...'
            }, { quoted: message });

            // API call
            const apiUrl = `https://arychauhann.onrender.com/api/lrclib?query=${encodeURIComponent(query)}`;
            const { data } = await axios.get(apiUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            // Response structure: {"operator": "...", "results": [{id, trackName, artistName, plainLyrics, ...}]}
            if (!data.results || data.results.length === 0) {
                const responseText = `No lyrics found for "${query}".\n\nTry a more specific song name.`;
                await sock.sendMessage(from, {
                    text: responseText,
                    edit: statusMsg.key
                }, { quoted: message });
                return;
            }

            // Take first result
            const song = data.results[0];
            const trackName = song.trackName;
            const artistName = song.artistName;
            const plainLyrics = cleanResponse(song.plainLyrics || '');

            let responseText = `🎵 **${trackName}**\n\n👤 Artist: ${artistName}\n\n📝 Lyrics:\n\n${plainLyrics}`;

            await sock.sendMessage(from, {
                text: responseText,
                edit: statusMsg.key
            }, { quoted: message });

            // Success react
            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Lyrics command error:', error);

            const errorMsg = error.code === 'ECONNABORTED'
                ? 'Request timeout - Try again later'
                : error.response?.status === 429
                ? 'Rate limit exceeded - try again in a moment'
                : error.message || 'Unknown error occurred';

            await sock.sendMessage(from, {
                text: `Failed to fetch lyrics\n\nError: ${errorMsg}\nTry again in a moment`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};