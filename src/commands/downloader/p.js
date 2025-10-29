import yts from 'yt-search';
import axios from 'axios';

export default {
    name: 'p',
    aliases: ['play2'],
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

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            const searchQuery = args.join(' ').trim();

            if (!searchQuery) {
                return await sock.sendMessage(from, {
                    text: `❌ Please provide a song name\n\nExample: ${prefix}play baby girl`
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '🔍', key: message.key }
            });

            const { videos } = await yts(searchQuery);
            
            if (!videos || videos.length === 0) {
                return await sock.sendMessage(from, {
                    text: `❌ No results found for: ${searchQuery}`
                }, { quoted: message });
            }

            const video = videos[0];
            const urlYt = video.url;
            const title = video.title;
            const thumbnail = video.thumbnail;

            await sock.sendMessage(from, {
                image: { url: thumbnail },
                caption: `🎵 *${title}*\n\n⏳ Downloading audio...`
            }, { quoted: message });

            let downloadUrl = null;

            const apis = [
                {
                    name: 'Dreaded',
                    url: `https://api.dreaded.site/api/ytdl/audio?url=${encodeURIComponent(urlYt)}`,
                    extract: (data) => data?.success && data?.downloadLink ? data.downloadLink : null
                },
                {
                    name: 'Siputzx',
                    url: `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(urlYt)}`,
                    extract: (data) => data?.status && data?.data?.dl ? data.data.dl : null
                },
                {
                    name: 'Ryzendesu',
                    url: `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(urlYt)}`,
                    extract: (data) => data?.url ? data.url : null
                },
                {
                    name: 'Vreden',
                    url: `https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(urlYt)}`,
                    extract: (data) => data?.result?.download ? data.result.download : null
                },
                {
                    name: 'Zenkey',
                    url: `https://api.zenkey.my.id/api/download/ytmp3?apikey=zenkey&url=${encodeURIComponent(urlYt)}`,
                    extract: (data) => data?.result?.download ? data.result.download : null
                },
                {
                    name: 'BetaBotz',
                    url: `https://api.betabotz.eu.org/api/download/ytmp3?url=${encodeURIComponent(urlYt)}&apikey=beta-deku07`,
                    extract: (data) => data?.result?.mp3 ? data.result.mp3 : null
                },
                {
                    name: 'Tiklydown',
                    url: `https://api.tiklydown.eu.org/api/download/ytmp3?url=${encodeURIComponent(urlYt)}`,
                    extract: (data) => data?.audio?.download ? data.audio.download : null
                },
                {
                    name: 'AlyaChan',
                    url: `https://api.alyachan.dev/api/ytmp3?url=${encodeURIComponent(urlYt)}&apikey=DitzOfc`,
                    extract: (data) => data?.data?.url ? data.data.url : null
                }
            ];

            for (const api of apis) {
                try {
                    console.log(`Trying ${api.name} API...`);
                    const response = await axios.get(api.url, {
                        timeout: 45000,
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    
                    downloadUrl = api.extract(response.data);
                    
                    if (downloadUrl) {
                        console.log(`${api.name} API SUCCESS`);
                        break;
                    }
                } catch (error) {
                    console.log(`${api.name} failed:`, error.message);
                    continue;
                }
            }

            if (!downloadUrl) {
                return await sock.sendMessage(from, {
                    text: `❌ Download failed. All APIs are unavailable.\n\nSong: ${title}\nURL: ${urlYt}\n\nPlease try again later or try a different song.`
                }, { quoted: message });
            }

            try {
                await sock.sendMessage(from, {
                    audio: { url: downloadUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `${title}.mp3`,
                    ptt: false
                }, { quoted: message });

                await sock.sendMessage(from, {
                    react: { text: '✅', key: message.key }
                });

            } catch (sendError) {
                try {
                    const audioBuffer = await axios.get(downloadUrl, {
                        responseType: 'arraybuffer',
                        timeout: 90000,
                        maxContentLength: 50 * 1024 * 1024
                    });

                    await sock.sendMessage(from, {
                        audio: Buffer.from(audioBuffer.data),
                        mimetype: 'audio/mpeg',
                        fileName: `${title}.mp3`,
                        ptt: false
                    }, { quoted: message });

                    await sock.sendMessage(from, {
                        react: { text: '✅', key: message.key }
                    });

                } catch (bufferError) {
                    return await sock.sendMessage(from, {
                        text: `❌ Failed to send audio. File may be too large.\n\nDirect link: ${downloadUrl}`
                    }, { quoted: message });
                }
            }

        } catch (error) {
            console.error('Play command error:', error);
            await sock.sendMessage(from, {
                text: `❌ Error: ${error.message}\n\nPlease try again.`
            }, { quoted: message });
        }
    }
};