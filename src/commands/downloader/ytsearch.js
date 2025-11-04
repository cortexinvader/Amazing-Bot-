import axios from 'axios';
import config from '../../config.js';

const API_KEY = 'a0ebe80e-bf1a-4dbf-8d36-6935b1bfa5ea';
const SEARCH_API = 'https://kaiz-apis.gleeze.com/api/ytsearch';

export default {
    name: 'ytsearch',
    aliases: ['yts', 'youtubesearch', 'searchyt'],
    category: 'downloader',
    description: 'Search for videos on YouTube',
    usage: 'ytsearch <query>',
    example: 'ytsearch Ilom music',
    cooldown: 3,
    permissions: [],
    args: true,
    minArgs: 1,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            const query = args.join(' ');

            await sock.sendMessage(from, {
                text: `🔍 *Searching YouTube...*\n\n📝 Query: ${query}\n⏳ Please wait...`
            }, { quoted: message });

            const response = await axios.get(SEARCH_API, {
                params: {
                    query: query,
                    apikey: API_KEY
                },
                timeout: 30000
            });

            if (!response.data || !response.data.results || response.data.results.length === 0) {
                await sock.sendMessage(from, {
                    text: `❌ *No Results Found*\n\nNo videos found for: ${query}\n\nTry different keywords.`
                }, { quoted: message });
                return;
            }

            const results = response.data.results.slice(0, 10);
            
            let resultText = `╭──⦿【 🎥 YOUTUBE SEARCH 】\n`;
            resultText += `│\n`;
            resultText += `│ 🔍 𝗤𝘂𝗲𝗿𝘆: ${query}\n`;
            resultText += `│ 📊 𝗥𝗲𝘀𝘂𝗹𝘁𝘀: ${results.length}\n`;
            resultText += `│\n`;
            resultText += `╰────────────⦿\n\n`;

            results.forEach((video, index) => {
                resultText += `*${index + 1}. ${video.title}*\n`;
                resultText += `👤 ${video.author || 'Unknown'}\n`;
                resultText += `⏱️ ${video.duration || 'N/A'}\n`;
                resultText += `👁️ ${video.views || 'N/A'}\n`;
                resultText += `🔗 ${video.url}\n\n`;
            });

            resultText += `╭─────────────⦿\n`;
            resultText += `│💫 | [ ${config.botName} 🍀 ]\n`;
            resultText += `╰────────────⦿\n\n`;
            resultText += `💡 Use ${prefix}ytmp3 <url> to download audio\n`;
            resultText += `💡 Use ${prefix}ytmp4 <url> to download video`;

            await sock.sendMessage(from, {
                text: resultText
            }, { quoted: message });

        } catch (error) {
            console.error('YouTube search error:', error);

            let errorMessage = '❌ *Search Failed*\n\n';
            
            if (error.response) {
                errorMessage += `Status: ${error.response.status}\n`;
                errorMessage += `Message: ${error.response.data?.message || 'API error'}\n`;
            } else if (error.request) {
                errorMessage += 'Network error. Check your connection.\n';
            } else {
                errorMessage += `Error: ${error.message}\n`;
            }

            errorMessage += '\nPlease try again later.';

            await sock.sendMessage(from, {
                text: errorMessage
            }, { quoted: message });
        }
    }
};