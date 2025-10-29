import axios from 'axios';

const SPOTIFY_CLIENT_ID = 'f9fff40f5e594655bb3215b658571231';
const SPOTIFY_CLIENT_SECRET = 'a51ac8aa4a354d24ae69c5f1335dd6db';

let spotifyToken = null;
let tokenExpiry = 0;

async function getSpotifyToken() {
    if (spotifyToken && Date.now() < tokenExpiry) {
        return spotifyToken;
    }

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token',
            'grant_type=client_credentials',
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
                }
            }
        );

        spotifyToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
        return spotifyToken;
    } catch (error) {
        console.error('Spotify token error:', error.message);
        return null;
    }
}

async function searchSpotifyTrack(query) {
    try {
        const token = await getSpotifyToken();
        if (!token) return null;

        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: {
                q: query,
                type: 'track',
                limit: 1
            }
        });

        if (response.data && response.data.tracks && response.data.tracks.items.length > 0) {
            const track = response.data.tracks.items[0];
            return {
                name: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                album: track.album.name,
                image: track.album.images[0]?.url || null,
                preview_url: track.preview_url,
                duration: Math.floor(track.duration_ms / 1000),
                spotify_url: track.external_urls.spotify
            };
        }
        return null;
    } catch (error) {
        console.error('Spotify search error:', error.message);
        return null;
    }
}

async function downloadFromYoutube(query) {
    const apis = [
        {
            name: 'YT1s',
            call: async (url) => {
                const searchRes = await axios.post('https://www.yt1s.com/api/ajaxSearch/index',
                    `q=${encodeURIComponent(url)}&vt=mp3`,
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'User-Agent': 'Mozilla/5.0'
                        },
                        timeout: 30000
                    }
                );

                if (searchRes.data?.links?.mp3) {
                    const key = Object.keys(searchRes.data.links.mp3)[0];
                    const kValue = searchRes.data.links.mp3[key].k;
                    
                    const convertRes = await axios.post('https://www.yt1s.com/api/ajaxConvert/convert',
                        `vid=${searchRes.data.vid}&k=${kValue}`,
                        {
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'User-Agent': 'Mozilla/5.0'
                            },
                            timeout: 30000
                        }
                    );
                    return convertRes.data?.dlink || null;
                }
                return null;
            }
        },
        {
            name: 'Y2Mate',
            call: async (url) => {
                const analyzeRes = await axios.get('https://www.y2mate.com/mates/analyzeV2/ajax', {
                    params: {
                        k_query: url,
                        k_page: 'home',
                        hl: 'en',
                        q_auto: 0
                    },
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    timeout: 30000
                });

                if (analyzeRes.data?.links?.mp3) {
                    const mp3Keys = Object.keys(analyzeRes.data.links.mp3);
                    if (mp3Keys.length > 0) {
                        const convertRes = await axios.get('https://www.y2mate.com/mates/convertV2/index', {
                            params: {
                                vid: analyzeRes.data.vid,
                                k: analyzeRes.data.links.mp3[mp3Keys[0]].k
                            },
                            headers: { 'User-Agent': 'Mozilla/5.0' },
                            timeout: 30000
                        });
                        return convertRes.data?.dlink || null;
                    }
                }
                return null;
            }
        }
    ];

    const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    
    for (const api of apis) {
        try {
            console.log(`Trying ${api.name}...`);
            const url = await api.call(youtubeUrl);
            if (url) {
                console.log(`${api.name} SUCCESS`);
                return url;
            }
        } catch (error) {
            console.log(`${api.name} failed:`, error.message);
            continue;
        }
    }
    return null;
}

export default {
    name: 'p',
    aliases: ['play2'],
    category: 'downloader',
    description: 'Download audio using Spotify API + YouTube',
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

            const searchMessage = await sock.sendMessage(from, {
                text: `🔍 *Searching on Spotify:* ${searchQuery}\n⏳ Please wait...`
            }, { quoted: message });

            const spotifyTrack = await searchSpotifyTrack(searchQuery);

            if (!spotifyTrack) {
                await sock.sendMessage(from, { delete: searchMessage.key });
                return await sock.sendMessage(from, {
                    text: `❌ No results found on Spotify for: ${searchQuery}\n\n💡 Try different keywords!`
                }, { quoted: message });
            }

            await sock.sendMessage(from, { delete: searchMessage.key });

            const infoText = `╭──⦿【 🎵 TRACK INFO 】
│
│ 📝 *Title:* ${spotifyTrack.name}
│ 👤 *Artist:* ${spotifyTrack.artist}
│ 💿 *Album:* ${spotifyTrack.album}
│ ⏱️ *Duration:* ${Math.floor(spotifyTrack.duration / 60)}:${(spotifyTrack.duration % 60).toString().padStart(2, '0')}
│ 🎧 *Source:* Spotify API
│
╰────────⦿

⏳ *Downloading audio...*`;

            if (spotifyTrack.image) {
                await sock.sendMessage(from, {
                    image: { url: spotifyTrack.image },
                    caption: infoText
                }, { quoted: message });
            } else {
                await sock.sendMessage(from, {
                    text: infoText
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '⬇️', key: message.key }
            });

            if (spotifyTrack.preview_url) {
                try {
                    await sock.sendMessage(from, {
                        audio: { url: spotifyTrack.preview_url },
                        mimetype: 'audio/mpeg',
                        fileName: `${spotifyTrack.name} - ${spotifyTrack.artist}.mp3`,
                        ptt: false
                    }, { quoted: message });

                    await sock.sendMessage(from, {
                        text: `✅ *Preview Sent*\n\n⚠️ This is a 30-second preview from Spotify\n\n💡 Full version downloading from YouTube...`
                    }, { quoted: message });
                } catch (previewError) {
                    console.log('Preview send failed:', previewError.message);
                }
            }

            const youtubeQuery = `${spotifyTrack.name} ${spotifyTrack.artist} official audio`;
            const downloadUrl = await downloadFromYoutube(youtubeQuery);

            if (!downloadUrl) {
                return await sock.sendMessage(from, {
                    text: `❌ *Download Failed*\n\nFound on Spotify but couldn't download full audio.\n\n🔗 *Listen on Spotify:*\n${spotifyTrack.spotify_url}\n\n💡 Try different song or check console logs.`
                }, { quoted: message });
            }

            try {
                await sock.sendMessage(from, {
                    audio: { url: downloadUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `${spotifyTrack.name} - ${spotifyTrack.artist}.mp3`,
                    ptt: false
                }, { quoted: message });

                const resultText = `╭──⦿【 ✅ DOWNLOADED 】
│
│ 📝 *Title:* ${spotifyTrack.name}
│ 👤 *Artist:* ${spotifyTrack.artist}
│ 💿 *Album:* ${spotifyTrack.album}
│ 📦 *Format:* MP3
│ 🌐 *Source:* Spotify + YouTube
│
╰────────⦿

🔗 *Spotify:* ${spotifyTrack.spotify_url}

💫 | [ Amazing Bot 🚀 ]
🔥 | Powered by Ilom`;

                await sock.sendMessage(from, {
                    text: resultText,
                    mentions: [sender]
                }, { quoted: message });

                await sock.sendMessage(from, {
                    react: { text: '✅', key: message.key }
                });

            } catch (sendError) {
                console.log('Direct send failed, trying buffer...');
                try {
                    const audioBuffer = await axios.get(downloadUrl, {
                        responseType: 'arraybuffer',
                        timeout: 90000,
                        maxContentLength: 50 * 1024 * 1024,
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });

                    await sock.sendMessage(from, {
                        audio: Buffer.from(audioBuffer.data),
                        mimetype: 'audio/mpeg',
                        fileName: `${spotifyTrack.name} - ${spotifyTrack.artist}.mp3`,
                        ptt: false
                    }, { quoted: message });

                    await sock.sendMessage(from, {
                        react: { text: '✅', key: message.key }
                    });

                } catch (bufferError) {
                    return await sock.sendMessage(from, {
                        text: `❌ Failed to send audio\n\n🔗 *Listen on Spotify:*\n${spotifyTrack.spotify_url}\n\nDirect link: ${downloadUrl}`
                    }, { quoted: message });
                }
            }

        } catch (error) {
            console.error('Play command error:', error);
            await sock.sendMessage(from, {
                text: `❌ Error: ${error.message}\n\n💡 Try: ${prefix}play <different song>`
            }, { quoted: message });
        }
    }
};