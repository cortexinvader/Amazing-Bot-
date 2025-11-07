import axios from 'axios';

export default {
    name: 'playstore',
    aliases: ['apk', 'app'],
    category: 'utility',
    description: 'Search and get APK download link from Play Store.',
    usage: 'playstore <app name>',
    example: 'playstore whatsapp',
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
                text: '❗ Please provide an app name to search.'
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

            const apiUrl = `https://arychauhann.onrender.com/api/playstore?query=${encodeURIComponent(query)}`;

            const response = await axios.get(apiUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const data = response.data;

            // Assuming API returns an array of apps or single object with apk_url
            // Adjust based on actual structure; for now, assume first result
            if (!data || !data[0] || !data[0].apk_url) {
                throw new Error('No APK found for the query');
            }

            const app = data[0];
            const downloadText = `📱 *${app.name || 'App'}*\n\n` +
                                 `• Developer: ${app.developer || 'N/A'}\n` +
                                 `• Package: ${app.package_name || 'N/A'}\n` +
                                 `• Version: ${app.version || 'N/A'}\n\n` +
                                 `🔗 *Download APK:*\n${app.apk_url || 'No link'}\n\n` +
                                 `⚠️ Use at your own risk. Verify APK safety!`;

            await sock.sendMessage(from, {
                text: downloadText
            }, { quoted: message });

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

        } catch (err) {
            console.error('Playstore command error:', err);
            await sock.sendMessage(from, {
                text: `❌ Failed to fetch APK: ${err.message}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};