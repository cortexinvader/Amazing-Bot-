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
    name: 'playstore',
    aliases: ['ps', 'app', 'apk'],
    category: 'utility',
    description: 'Search Play Store for apps and get download info',
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
                    text: `Usage: ${prefix}playstore <app name>\n\nExample: ${prefix}playstore instagram`
                }, { quoted: message });
            }

            // React to user's message
            await sock.sendMessage(from, {
                react: { text: '📱', key: message.key }
            });

            // Send processing message
            const statusMsg = await sock.sendMessage(from, {
                text: '⏳ Searching Play Store...'
            }, { quoted: message });

            // API call
            const apiUrl = `https://arychauhann.onrender.com/api/playstore?query=${encodeURIComponent(query)}`;
            const { data } = await axios.get(apiUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            // Assuming response structure: {"operator": "...", "result": [{app details with download url?}]}
            // If empty, show no results
            if (!data.result || data.result.length === 0) {
                const responseText = `No apps found for "${query}".\n\nTry a different search term.`;
                await sock.sendMessage(from, {
                    text: responseText,
                    edit: statusMsg.key
                }, { quoted: message });
                return;
            }

            // For first result, extract name, icon?, download link (assume 'downloadUrl' field)
            const app = data.result[0];
            const appName = app.name || app.title || 'Unknown App';
            const developer = app.developer || 'Unknown Developer';
            const downloadUrl = app.downloadUrl || app.apkUrl || null; // Assume field for APK
            const iconUrl = app.icon || app.iconUrl || null;

            let responseText = `📱 **${appName}**\n\n👨‍💻 Developer: ${developer}\n\n`;
            if (downloadUrl) {
                responseText += `🔗 Download APK: ${downloadUrl}\n\n`;
            } else {
                responseText += `No direct download available.\n\n`;
            }
            responseText += `Search for: "${query}"`;

            // If icon, could fetch and send as image, but for simplicity, text only
            await sock.sendMessage(from, {
                text: responseText,
                edit: statusMsg.key
            }, { quoted: message });

            // Success react
            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Playstore command error:', error);

            const errorMsg = error.code === 'ECONNABORTED'
                ? 'Request timeout - Try again later'
                : error.response?.status === 429
                ? 'Rate limit exceeded - try again in a moment'
                : error.message || 'Unknown error occurred';

            await sock.sendMessage(from, {
                text: `Failed to search Play Store\n\nError: ${errorMsg}\nTry again in a moment`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};