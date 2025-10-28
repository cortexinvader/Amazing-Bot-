import yts from 'yt-search';
import axios from 'axios';

export default {
    name: 'play',
    aliases: ['song'],
    category: 'downloader',
    description: 'Download audio from YouTube',
    usage: '.play <song name>',
    example: '.play baby girl by joeboy',
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
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, command, from, sender, prefix }) {
        try {
            const searchQuery = args.join(' ').trim();

            if (!searchQuery) {
                await sock.sendMessage(from, {
                    text: `❌ *Missing Song Name*\n\n📜 *Usage:* ${prefix}play <song name>\n\n🎶 *Example:* ${prefix}play Baby Girl by Joeboy`
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, {
                react: { text: '🔍', key: message.key }
            });

            const searchMessage = await sock.sendMessage(from, {
                text: `🔍 *Searching:* ${searchQuery}\n⏳ Please wait...`
            }, { quoted: message });

            const { videos } = await yts(searchQuery);
            
            if (!videos || videos.length === 0) {
                await sock.sendMessage(from, { delete: searchMessage.key });
                await sock.sendMessage(from, {
                    text: `❌ *No Results Found*\n\nNo videos found for: *${searchQuery}*\n\n💡 Try different keywords!`
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
            const published = video.ago;
            const videoId = video.videoId;

            const infoText = `*◉—⌈🔊 AUDIO PLAYER⌋—◉*

📌 *TITLE:* ${title}
📆 *PUBLISHED:* ${published}
⌚ *DURATION:* ${duration}
👀 *VIEWS:* ${this.formatNumber(views)}
👤 *AUTHOR:* ${author}
🆔 *ID:* ${videoId}
🔗 *LINK:* ${urlYt}

⏳ *Sending audio 🔊, please wait...*`;

            await sock.sendMessage(from, { delete: searchMessage.key });

            await sock.sendMessage(from, {
                image: { url: thumbnail },
                caption: infoText
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '⬇️', key: message.key }
            });

            const downloadMessage = await sock.sendMessage(from, {
                text: `📥 *Downloading:* ${title}\n⏳ Please wait...`
            }, { quoted: message });

            let downloadUrl = null;
            let apiUsed = '';

            try {
                const response = await axios.get(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(urlYt)}`, {
                    timeout: 60000
                });
                if (response.data && response.data.status && response.data.data && response.data.data.dl) {
                    downloadUrl = response.data.data.dl;
                    apiUsed = 'SiputZX API';
                }
            } catch (error) {
                console.log('SiputZX API failed:', error.message);
            }

            if (!downloadUrl) {
                try {
                    const response = await axios.get(`https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(urlYt)}`, {
                        timeout: 60000
                    });
                    if (response.data && response.data.url) {
                        downloadUrl = response.data.url;
                        apiUsed = 'Ryzendesu API';
                    }
                } catch (error) {
                    console.log('Ryzendesu API failed:', error.message);
                }
            }

            if (!downloadUrl) {
                try {
                    const response = await axios.get(`https://api.zenkey.my.id/api/download/ytmp3?apikey=zenkey&url=${encodeURIComponent(urlYt)}`, {
                        timeout: 60000
                    });
                    if (response.data && response.data.result && response.data.result.download) {
                        downloadUrl = response.data.result.download;
                        apiUsed = 'Zenkey API';
                    }
                } catch (error) {
                    console.log('Zenkey API failed:', error.message);
                }
            }

            if (!downloadUrl) {
                try {
                    const response = await axios.get(`https://api.betabotz.eu.org/api/download/ytmp3?url=${encodeURIComponent(urlYt)}&apikey=beta-deku07`, {
                        timeout: 60000
                    });
                    if (response.data && response.data.result && response.data.result.mp3) {
                        downloadUrl = response.data.result.mp3;
                        apiUsed = 'BetaBotz API';
                    }
                } catch (error) {
                    console.log('BetaBotz API failed:', error.message);
                }
            }

            if (!downloadUrl) {
                try {
                    const response = await axios.get(`https://api.zahwazein.xyz/downloader/ytmp3?url=${encodeURIComponent(urlYt)}&apikey=zenzkey_92c0a19ec6fb`, {
                        timeout: 60000
                    });
                    if (response.data && response.data.result && response.data.result.download) {
                        downloadUrl = response.data.result.download;
                        apiUsed = 'Zahwazein API';
                    }
                } catch (error) {
                    console.log('Zahwazein API failed:', error.message);
                }
            }

            if (!downloadUrl) {
                try {
                    const response = await axios.get(`https://api.alyachan.dev/api/ytmp3?url=${encodeURIComponent(urlYt)}&apikey=DitzOfc`, {
                        timeout: 60000
                    });
                    if (response.data && response.data.data && response.data.data.url) {
                        downloadUrl = response.data.data.url;
                        apiUsed = 'AlyaChan API';
                    }
                } catch (error) {
                    console.log('AlyaChan API failed:', error.message);
                }
            }

            if (!downloadUrl) {
                try {
                    const response = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(urlYt)}`, {
                        timeout: 60000
                    });
                    if (response.data && response.data.result && response.data.result.download) {
                        downloadUrl = response.data.result.download;
                        apiUsed = 'Vreden API';
                    }
                } catch (error) {
                    console.log('Vreden API failed:', error.message);
                }
            }

            if (!downloadUrl) {
                try {
                    const response = await axios.get(`https://api.tiklydown.eu.org/api/download/ytmp3?url=${encodeURIComponent(urlYt)}`, {
                        timeout: 60000
                    });
                    if (response.data && response.data.audio && response.data.audio.download) {
                        downloadUrl = response.data.audio.download;
                        apiUsed = 'Tiklydown API';
                    }
                } catch (error) {
                    console.log('Tiklydown API failed:', error.message);
                }
            }

            if (!downloadUrl) {
                await sock.sendMessage(from, { delete: downloadMessage.key });
                await sock.sendMessage(from, {
                    text: `❌ *Download Failed*\n\n⚠️ All download APIs are currently unavailable.\n\n📝 *Song:* ${title}\n🔗 *URL:* ${urlYt}\n\n💡 *FREE API Sources (No RapidAPI):*\n\n🔹 *Self-Host yt-dlp*\n🔗 github.com/yt-dlp/yt-dlp\n💰 Free & Unlimited\n📦 Deploy on Railway.app (free)\n\n🔹 *YT-DLP API Wrapper*\n🔗 github.com/Itz-fork/Yt-Dl-Bot-Api\n💰 Free, self-hosted\n\n🔹 *Free API Lists*\n🔗 github.com/public-apis/public-apis\n🔗 github.com/fayazara/apihouse\n\n🔹 *Deploy Your Own*\nUse Vercel/Railway/Render for free hosting`
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, { delete: downloadMessage.key });

            const resultCaption = `╭──⦿【 🎵 AUDIO DOWNLOADED 】
│
│ 📝 *Title:* ${title}
│ 👤 *Channel:* ${author}
│ ⌚ *Duration:* ${duration}
│ 👁️ *Views:* ${this.formatNumber(views)}
│ 📦 *Format:* MP3
│ 🎚️ *Quality:* 128kbps
│ 🌐 *Source:* ${apiUsed}
│
╰────────⦿

💫 | [ Amazing Bot 🚀 ]
🔥 | Powered by Ilom`;

            try {
                const audioBuffer = await axios.get(downloadUrl, {
                    responseType: 'arraybuffer',
                    timeout: 120000,
                    maxContentLength: 50 * 1024 * 1024,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                await sock.sendMessage(from, {
                    audio: Buffer.from(audioBuffer.data),
                    mimetype: 'audio/mpeg',
                    fileName: `${title.substring(0, 50)}.mp3`,
                    ptt: false
                }, { quoted: message });

                await sock.sendMessage(from, {
                    text: resultCaption,
                    mentions: [sender]
                }, { quoted: message });

            } catch (bufferError) {
                await sock.sendMessage(from, {
                    audio: { url: downloadUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `${title.substring(0, 50)}.mp3`,
                    ptt: false
                }, { quoted: message });

                await sock.sendMessage(from, {
                    text: resultCaption,
                    mentions: [sender]
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Play command error:', error);
            
            await sock.sendMessage(from, {
                text: `❌ *Download Failed*\n\n⚠️ Error: ${error.message}\n\n💡 *Self-Host Solution (FREE):*\n\n*yt-dlp API (Recommended)*\n1. Fork: github.com/Itz-fork/Yt-Dl-Bot-Api\n2. Deploy on Railway.app (free)\n3. Get your API URL\n4. Update bot with your URL\n\n*Quick Deploy:*\n🔗 railway.app/new/template/yt-dlp\n⚡ One-click deploy\n💰 Free 500 hours/month\n\n📧 Contact bot owner for setup help`
            }, { quoted: message });
        }
    },

    formatNumber(number) {
        if (!number) return '0';
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
};