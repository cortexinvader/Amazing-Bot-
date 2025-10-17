import yts from 'yt-search';
import axios from 'axios';

export default {
    name: 'play',
    aliases: ['p', 'music', 'yt'],
    category: 'downloader',
    description: 'Download and play audio from YouTube by searching song name with album artwork',
    usage: 'play <song name>',
    example: 'play baby girl by joeboy\nplay lucid dreams',
    cooldown: 10,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    maxArgs: 50,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true, // Enable reactions
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            const searchQuery = args.join(' ').trim();

            if (!searchQuery) {
                await sock.sendMessage(from, {
                    text: '❌ *Oops!*\nPlease provide a song name.\n\n📜 *Usage*: `play <song name>`\n🎶 *Example*: `play baby girl by joeboy`'
                }, { quoted: message });
                return;
            }

            // React with magnifying glass emoji (🔍) to indicate searching
            await sock.sendMessage(from, {
                react: { text: '🔍', key: message.key }
            });

            // Send search message and store its ID
            const searchMessage = await sock.sendMessage(from, {
                text: `🎵 *Searching*: ${searchQuery}...`
            }, { quoted: message });

            const { videos } = await yts(searchQuery);
            
            if (!videos || videos.length === 0) {
                // Delete search message
                await sock.sendMessage(from, { delete: searchMessage.key });
                await sock.sendMessage(from, {
                    text: `❌ *Not Found*\nNo results for: *${searchQuery}*\n\n🔍 Try different keywords!`
                }, { quoted: message });
                return;
            }

            const video = videos[0];
            const urlYt = video.url;
            const title = video.title;
            const thumbnail = video.thumbnail;
            const duration = video.timestamp;
            const views = video.views;
            const author = video.author.name;

            let audioUrl;
            let finalTitle = title;

            try {
                const response = await axios.get(`https://apis-keith.vercel.app/download/dlmp3?url=${urlYt}`, {
                    timeout: 25000
                });
                const data = response.data;

                if (data && data.status && data.result && data.result.downloadUrl) {
                    audioUrl = data.result.downloadUrl;
                    finalTitle = data.result.title || title;
                } else {
                    throw new Error('Keith API failed');
                }
            } catch (keithError) {
                try {
                    const izumiResponse = await axios.get(`https://izumiiiiiiii.dpdns.org/downloader/youtube?url=${encodeURIComponent(urlYt)}&format=mp3`, {
                        timeout: 25000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });

                    if (izumiResponse.data && izumiResponse.data.result && izumiResponse.data.result.download) {
                        audioUrl = izumiResponse.data.result.download;
                        finalTitle = izumiResponse.data.result.title || title;
                    } else {
                        throw new Error('Both APIs failed');
                    }
                } catch (izumiError) {
                    // Delete search message
                    await sock.sendMessage(from, { delete: searchMessage.key });
                    await sock.sendMessage(from, {
                        text: '❌ *Error*\nFailed to download: APIs unavailable.\n\n💡 Try again later!'
                    }, { quoted: message });
                    return;
                }
            }

            // Delete search message
            await sock.sendMessage(from, { delete: searchMessage.key });

            // Send audio with details in caption
            await sock.sendMessage(from, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                fileName: `${finalTitle}.mp3`,
                caption: `✅ *Song Downloaded*\n📝 *Title*: ${finalTitle}\n👤 *Artist*: ${author}\n⏱ *Duration*: ${duration}\n📦 *Format*: MP3`
            }, { quoted: message });

        } catch (error) {
            console.error('Error in play command:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to download: ${error.message}\n\n💡 Try again later!`
            }, { quoted: message });
        }
    }
};
