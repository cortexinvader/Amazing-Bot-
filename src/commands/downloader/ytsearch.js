import axios from 'axios';

export default {
    name: 'yts',
    aliases: ['ytsearch', 'youtube'],
    category: 'downloader',
    description: 'Search YouTube videos and display results with thumbnails.',
    usage: 'yts <query>',
    example: 'yts Baby girl joeboy',
    cooldown: 7,
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
                text: '❗ Please provide a YouTube search query.'
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

            const count = 5; // Limit to 5 results for neat output
            const apiUrl = `https://arychauhann.onrender.com/api/youtubesearch?q=${encodeURIComponent(query)}&count=${count}`;

            const response = await axios.get(apiUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const data = response.data;

            // Assuming API returns an array of objects like [{title, thumbnail, duration, views, channel, url}, ...]
            // Adjust keys based on actual API structure if known
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('No YouTube results found');
            }

            // Send intro message
            await sock.sendMessage(from, {
                text: `🎥 *YouTube Search Results for:* ${query}\n\nFound ${data.length} results. Here they are:`
            }, { quoted: message });

            // Loop through results and send each neatly (all at once in sequence)
            for (const [index, item] of data.entries()) {
                const title = item.title || 'Untitled';
                const description = item.description || 'No description available.';
                const thumbnail = item.thumbnail || item.image || item.cover;
                const duration = item.duration || 'N/A';
                const views = item.views || 'N/A';
                const channel = item.channel || item.author || 'Unknown';
                const url = item.url || item.link || '';

                if (!thumbnail) continue; // Skip if no thumbnail

                const caption = `📺 *${title}*\n\n` +
                                `• Channel: ${channel}\n` +
                                `• Duration: ${duration}\n` +
                                `• Views: ${views}\n\n` +
                                `${description.substring(0, 150)}${description.length > 150 ? '...' : ''}\n\n` +
                                `${url ? `🔗 [Watch](${url})` : ''}\n\n` +
                                `_Result ${index + 1}/${data.length}_`;

                await sock.sendMessage(from, {
                    image: { url: thumbnail },
                    caption: caption
                }, { quoted: message });
            }

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

        } catch (err) {
            console.error('YTS command error:', err);
            await sock.sendMessage(from, {
                text: `❌ Failed to search YouTube: ${err.message}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};