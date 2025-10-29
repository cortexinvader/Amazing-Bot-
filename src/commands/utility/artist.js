import axios from 'axios';

export default {
    name: 'artist',
    aliases: ['musician', 'singer'],
    category: 'utility',
    description: 'Search for artist information with image',
    usage: '.artist <artist name>',
    example: '.artist Adele\n.artist Drake',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    maxArgs: 10,
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
            const artistName = args.join(' ').trim();

            if (!artistName) {
                await sock.sendMessage(from, {
                    text: `❌ *Missing Artist Name*\n\n📜 *Usage:* ${prefix}artist <artist name>\n\n🎤 *Example:*\n${prefix}artist Adele\n${prefix}artist Ed Sheeran`
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, {
                react: { text: '🔍', key: message.key }
            });

            const searchMessage = await sock.sendMessage(from, {
                text: `🔍 *Searching for:* ${artistName}\n⏳ Please wait...`
            }, { quoted: message });

            let artistData = null;
            let apiUsed = '';

            try {
                const lastfmResponse = await axios.get(`https://ws.audioscrobbler.com/2.0/`, {
                    params: {
                        method: 'artist.getinfo',
                        artist: artistName,
                        api_key: '345e5bb8fe1c6d0414ef99b85c08caa4',
                        format: 'json',
                        autocorrect: 1
                    },
                    timeout: 15000
                });

                if (lastfmResponse.data && lastfmResponse.data.artist) {
                    const artist = lastfmResponse.data.artist;
                    artistData = {
                        name: artist.name,
                        image: artist.image?.find(img => img.size === 'extralarge')?.['#text'] || 
                               artist.image?.find(img => img.size === 'large')?.['#text'] ||
                               artist.image?.find(img => img.size === 'medium')?.['#text'] ||
                               'https://i.ibb.co/2M7rtLk/ilom.jpg',
                        bio: artist.bio?.summary || artist.bio?.content || 'No biography available',
                        listeners: artist.stats?.listeners || '0',
                        playcount: artist.stats?.playcount || '0',
                        tags: artist.tags?.tag?.map(t => t.name).slice(0, 5) || [],
                        url: artist.url || '',
                        similar: artist.similar?.artist?.map(a => a.name).slice(0, 5) || []
                    };
                    apiUsed = 'Last.fm API';
                }
            } catch (error) {
                console.log('Last.fm API failed:', error.message);
            }

            if (!artistData) {
                try {
                    const musicbrainzResponse = await axios.get(`https://musicbrainz.org/ws/2/artist/`, {
                        params: {
                            query: artistName,
                            fmt: 'json',
                            limit: 1
                        },
                        timeout: 15000,
                        headers: {
                            'User-Agent': 'AmazingBot/1.0'
                        }
                    });

                    if (musicbrainzResponse.data && musicbrainzResponse.data.artists && musicbrainzResponse.data.artists.length > 0) {
                        const artist = musicbrainzResponse.data.artists[0];
                        artistData = {
                            name: artist.name,
                            image: 'https://i.ibb.co/2M7rtLk/ilom.jpg',
                            bio: artist.disambiguation || 'No biography available',
                            listeners: 'N/A',
                            playcount: 'N/A',
                            tags: artist.tags?.map(t => t.name).slice(0, 5) || [],
                            url: `https://musicbrainz.org/artist/${artist.id}`,
                            similar: []
                        };
                        apiUsed = 'MusicBrainz API';
                    }
                } catch (error) {
                    console.log('MusicBrainz API failed:', error.message);
                }
            }

            if (!artistData) {
                await sock.sendMessage(from, { delete: searchMessage.key });
                await sock.sendMessage(from, {
                    text: `❌ *Artist Not Found*\n\nNo information found for: *${artistName}*\n\n💡 *Try:*\n• Checking spelling\n• Using full artist name\n• Searching popular artists\n\n🎤 *Example:* ${prefix}artist Adele`
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, { delete: searchMessage.key });

            const cleanBio = artistData.bio
                .replace(/<a[^>]*>.*?<\/a>/g, '')
                .replace(/<[^>]+>/g, '')
                .replace(/\n\s*\n/g, '\n')
                .trim();

            const shortBio = cleanBio.length > 400 ? cleanBio.substring(0, 400) + '...' : cleanBio;

            const infoText = `╭──⦿【 🎤 ARTIST INFO 】
│
│ 👤 *Name:* ${artistData.name}
│ 👁️ *Listeners:* ${this.formatNumber(artistData.listeners)}
│ ▶️ *Total Plays:* ${this.formatNumber(artistData.playcount)}
│
╰────────⦿

╭──⦿【 📖 BIOGRAPHY 】
│
│ ${shortBio.split('\n').map(line => line.trim()).filter(line => line).join('\n│ ')}
│
╰────────⦿

${artistData.tags.length > 0 ? `╭──⦿【 🏷️ GENRES 】
│
│ ${artistData.tags.map(tag => `• ${tag}`).join('\n│ ')}
│
╰────────⦿\n\n` : ''}${artistData.similar.length > 0 ? `╭──⦿【 🎵 SIMILAR ARTISTS 】
│
│ ${artistData.similar.map(art => `• ${art}`).join('\n│ ')}
│
╰────────⦿\n\n` : ''}${artistData.url ? `🔗 *More Info:* ${artistData.url}\n\n` : ''}🌐 *Source:* ${apiUsed}

💫 | [ Amazing Bot 🚀 ]
🔥 | Powered by Ilom`;

            await sock.sendMessage(from, {
                image: { url: artistData.image },
                caption: infoText,
                mentions: [sender]
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Artist command error:', error);
            
            let errorMsg = error.message || 'Unknown error occurred';
            let errorTip = '💡 Try again later!';
            
            if (error.message.includes('timeout')) {
                errorTip = '💡 Request timeout. Check your connection.';
            } else if (error.message.includes('ENOTFOUND')) {
                errorTip = '💡 Network error. Check internet connection.';
            } else if (error.message.includes('404')) {
                errorTip = '💡 Artist not found. Try different spelling.';
            }

            await sock.sendMessage(from, {
                text: `❌ *Search Failed*\n\n⚠️ Error: ${errorMsg}\n\n${errorTip}\n\n🎤 Try:\n• Different artist name\n• Popular artists\n• Correct spelling`
            }, { quoted: message });
        }
    },

    formatNumber(num) {
        if (!num || num === 'N/A' || num === '0') return 'N/A';
        const number = parseInt(num);
        if (isNaN(number)) return 'N/A';
        if (number >= 1000000000) {
            return (number / 1000000000).toFixed(1) + 'B';
        } else if (number >= 1000000) {
            return (number / 1000000).toFixed(1) + 'M';
        } else if (number >= 1000) {
            return (number / 1000).toFixed(1) + 'K';
        }
        return number.toLocaleString();
    }
};