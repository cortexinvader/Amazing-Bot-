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

async function searchYouTube(query) {
    try {
        const yts = (await import('youtube-yts')).default;
        const results = await yts(query);
        if (results && results.all && results.all.length > 0) {
            return results.all[0].url;
        }
        return null;
    } catch (error) {
        console.error('YouTube search error:', error.message);
        return null;
    }
}

async function downloadFromRebix(youtubeUrl) {
    try {
        const apiUrl = `https://api-rebix.vercel.app/api/yta?url=${encodeURIComponent(youtubeUrl)}`;
        const response = await axios.get(apiUrl, { timeout: 30000 });
        
        if (response.data && response.data.status && response.data.downloadUrl) {
            return response.data.downloadUrl;
        }
        return null;
    } catch (error) {
        console.error('Rebix API error:', error.message);
        return null;
    }
}

export default {
    name: 'p',
    aliases: ['play2','ytplay'],
    category: 'downloader',
    description: 'Search and play songs using Spotify + YouTube',
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
                    text: `❌ *Please provide a song name*\n\n📜 *Usage:* ${prefix}play <song name>\n\n🎶 *Example:* ${prefix}play Baby Girl by Joeboy`
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '🔍', key: message.key }
            });

            const searchMessage = await sock.sendMessage(from, {
                text: `🔍 *Searching:* ${searchQuery}\n⏳ Please wait...`
            }, { quoted: message });

            const spotifyTrack = await searchSpotifyTrack(searchQuery);

            if (!spotifyTrack) {
                await sock.sendMessage(from, { delete: searchMessage.key });
                return await sock.sendMessage(from, {
                    text: `❌ *No Results Found*\n\nNo tracks found for: *${searchQuery}*\n\n💡 Try different keywords!`
                }, { quoted: message });
            }

            await sock.sendMessage(from, { delete: searchMessage.key });

            const infoText = `*◉—⌈🔊 AUDIO PLAYER⌋—◉*

📌 *TITLE:* ${spotifyTrack.name}
👤 *ARTIST:* ${spotifyTrack.artist}
💿 *ALBUM:* ${spotifyTrack.album}
⌚ *DURATION:* ${Math.floor(spotifyTrack.duration / 60)}:${(spotifyTrack.duration % 60).toString().padStart(2, '0')}
🎧 *SOURCE:* Spotify API

⏳ *Sending audio 🔊, please wait...*`;

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

            const downloadMessage = await sock.sendMessage(from, {
                text: `📥 *Downloading:* ${spotifyTrack.name}\n⏳ Please wait...`
            }, { quoted: message });

            const youtubeQuery = `${spotifyTrack.name} ${spotifyTrack.artist} official audio`;
            const youtubeUrl = await searchYouTube(youtubeQuery);

            if (!youtubeUrl) {
                await sock.sendMessage(from, { delete: downloadMessage.key });
                return await sock.sendMessage(from, {
                    text: `❌ *Download Failed*\n\nCouldn't find YouTube video.\n\n🔗 *Listen on Spotify:*\n${spotifyTrack.spotify_url}`
                }, { quoted: message });
            }

            const downloadUrl = await downloadFromRebix(youtubeUrl);

            if (!downloadUrl) {
                await sock.sendMessage(from, { delete: downloadMessage.key });
                return await sock.sendMessage(from, {
                    text: `❌ *Download Failed*\n\n⚠️ Rebix API error\n\n📝 *Song:* ${spotifyTrack.name}\n🔗 *YouTube:* ${youtubeUrl}\n🎵 *Spotify:* ${spotifyTrack.spotify_url}\n\n💡 Try again later`
                }, { quoted: message });
            }

            await sock.sendMessage(from, { delete: downloadMessage.key });

            const resultCaption = `╭──⦿【 🎵 AUDIO DOWNLOADED 】
│
│ 📝 *Title:* ${spotifyTrack.name}
│ 👤 *Artist:* ${spotifyTrack.artist}
│ 💿 *Album:* ${spotifyTrack.album}
│ ⌚ *Duration:* ${Math.floor(spotifyTrack.duration / 60)}:${(spotifyTrack.duration % 60).toString().padStart(2, '0')}
│ 📦 *Format:* MP3
│ 🎚️ *Quality:* 128kbps
│ 🌐 *Source:* Spotify + YouTube
│
╰────────⦿

💫 | [ Amazing Bot 🚀 ]
🔥 | Powered by Ilom`;

            try {
                await sock.sendMessage(from, {
                    audio: { url: downloadUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `${spotifyTrack.name} - ${spotifyTrack.artist}.mp3`,
                    ptt: false
                }, { quoted: message });

                await sock.sendMessage(from, {
                    text: resultCaption,
                    mentions: [sender]
                }, { quoted: message });

                await sock.sendMessage(from, {
                    react: { text: '✅', key: message.key }
                });

            } catch (sendError) {
                console.log('Direct send failed, trying buffer method...');
                
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
                        fileName: `${spotifyTrack.name} - ${spotifyTrack.artist}.mp3`,
                        ptt: false
                    }, { quoted: message });

                    await sock.sendMessage(from, {
                        text: resultCaption,
                        mentions: [sender]
                    }, { quoted: message });

                    await sock.sendMessage(from, {
                        react: { text: '✅', key: message.key }
                    });

                } catch (bufferError) {
                    return await sock.sendMessage(from, {
                        text: `❌ *Failed to send audio*\n\n⚠️ Error: ${bufferError.message}\n\n🔗 *Listen on Spotify:*\n${spotifyTrack.spotify_url}\n\n💡 Direct download link:\n${downloadUrl}`
                    }, { quoted: message });
                }
            }

        } catch (error) {
            console.error('Play command error:', error);
            
            await sock.sendMessage(from, {
                text: `❌ *Download Failed*\n\n⚠️ Error: ${error.message}\n\n💡 Try:\n• ${prefix}play <different song>\n• Check your internet connection\n• Contact bot owner if issue persists`
            }, { quoted: message });
        }
    }
};