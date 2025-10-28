import yts from 'yt-search';
import axios from 'axios';
import ytdl from 'ytdl-core';

export default {
    name: 'play',
    aliases: ['p'],
    category: 'downloader',
    description: 'Download audio from YouTube using multiple APIs',
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
                const akuariResponse = await axios.get(`https://api.akuari.my.id/downloader/youtube?link=${encodeURIComponent(urlYt)}`, {
                    timeout: 45000
                });

                if (akuariResponse.data && akuariResponse.data.mp3 && akuariResponse.data.mp3[1]) {
                    downloadUrl = akuariResponse.data.mp3[1].url;
                    apiUsed = 'Akuari API';
                }
            } catch (error) {
                console.log('Akuari API failed:', error.message);
            }

            if (!downloadUrl) {
                try {
                    const ytdlInfo = await ytdl.getInfo(urlYt);
                    const audioFormat = ytdl.chooseFormat(ytdlInfo.formats, { filter: 'audioonly', quality: 'highestaudio' });
                    downloadUrl = audioFormat.url;
                    apiUsed = 'YTDL-Core';
                } catch (error) {
                    console.log('YTDL-Core failed:', error.message);
                }
            }

            if (!downloadUrl) {
                try {
                    const bk9Response = await axios.get(`https://api.bk9.fun/tools/ytmp3?url=${encodeURIComponent(urlYt)}`, {
                        timeout: 45000,
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });

                    if (bk9Response.data && bk9Response.data.BK9) {
                        downloadUrl = bk9Response.data.BK9;
                        apiUsed = 'BK9 API';
                    }
                } catch (error) {
                    console.log('BK9 API failed:', error.message);
                }
            }

            if (!downloadUrl) {
                try {
                    const nyxResponse = await axios.get(`https://api.nyxs.pw/dl/yt-direct?url=${encodeURIComponent(urlYt)}`, {
                        timeout: 45000
                    });

                    if (nyxResponse.data && nyxResponse.data.result && nyxResponse.data.result.urlAudio) {
                        downloadUrl = nyxResponse.data.result.urlAudio;
                        apiUsed = 'Nyxs API';
                    }
                } catch (error) {
                    console.log('Nyxs API failed:', error.message);
                }
            }

            if (!downloadUrl) {
                try {
                    const agatzResponse = await axios.get(`https://api.agatz.xyz/api/ytmp3?url=${encodeURIComponent(urlYt)}`, {
                        timeout: 45000
                    });

                    if (agatzResponse.data && agatzResponse.data.data && agatzResponse.data.data.dl) {
                        downloadUrl = agatzResponse.data.data.dl;
                        apiUsed = 'Agatz API';
                    }
                } catch (error) {
                    console.log('Agatz API failed:', error.message);
                }
            }

            if (!downloadUrl) {
                try {
                    const vihangaResponse = await axios.get(`https://vihangayt.me/download/ytmp3?url=${encodeURIComponent(urlYt)}`, {
                        timeout: 45000
                    });

                    if (vihangaResponse.data && vihangaResponse.data.data && vihangaResponse.data.data.download) {
                        downloadUrl = vihangaResponse.data.data.download;
                        apiUsed = 'Vihanga API';
                    }
                } catch (error) {
                    console.log('Vihanga API failed:', error.message);
                }
            }

            if (!downloadUrl) {
                try {
                    const widipeResponse = await axios.get(`https://widipe.com/download/ytdl?url=${encodeURIComponent(urlYt)}`, {
                        timeout: 45000
                    });

                    if (widipeResponse.data && widipeResponse.data.result && widipeResponse.data.result.mp3) {
                        downloadUrl = widipeResponse.data.result.mp3;
                        apiUsed = 'Widipe API';
                    }
                } catch (error) {
                    console.log('Widipe API failed:', error.message);
                }
            }

            if (!downloadUrl) {
                await sock.sendMessage(from, { delete: downloadMessage.key });
                await sock.sendMessage(from, {
                    text: `❌ *Download Failed*\n\n⚠️ All download APIs are currently unavailable.\n\n💡 *Try:*\n• Using a different song\n• Waiting a few minutes\n• Checking if the video is available\n\n📝 *Song:* ${title}\n🔗 *URL:* ${urlYt}`
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
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'DNT': '1',
                        'Upgrade-Insecure-Request': '1'
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
            
            let errorMsg = error.message || 'Unknown error occurred';
            let errorTip = '💡 Try again later!';
            
            if (error.message.includes('timeout')) {
                errorTip = '💡 Download timeout. Try a shorter song or check your connection.';
            } else if (error.message.includes('ENOTFOUND')) {
                errorTip = '💡 Network error. Check your internet connection.';
            } else if (error.message.includes('403')) {
                errorTip = '💡 Access denied. The APIs may be rate limited.';
            } else if (error.message.includes('404')) {
                errorTip = '💡 Video not found. Try a different search query.';
            } else if (error.message.includes('429')) {
                errorTip = '💡 Too many requests. Wait a few minutes and try again.';
            } else if (error.message.includes('maxContentLength')) {
                errorTip = '💡 File too large. Try a shorter song.';
            }

            await sock.sendMessage(from, {
                text: `❌ *Download Failed*\n\n⚠️ Error: ${errorMsg}\n\n${errorTip}\n\n🐛 If this persists, try:\n• Different song name\n• Official music videos\n• Waiting a few minutes`
            }, { quoted: message });
        }
    },

    formatNumber(number) {
        if (!number) return '0';
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
};