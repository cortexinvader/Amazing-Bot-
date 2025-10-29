import { createCanvas, loadImage } from '@napi-rs/canvas';
import axios from 'axios';

export default {
    name: 'artist',
    aliases: ['musician', 'singer'],
    category: 'utility',
    description: 'Search for artist information with beautiful display',
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

            const shortBio = cleanBio.length > 300 ? cleanBio.substring(0, 300) + '...' : cleanBio;

            const artistCanvas = await this.createArtistCard({
                name: artistData.name,
                image: artistData.image,
                listeners: artistData.listeners,
                playcount: artistData.playcount,
                tags: artistData.tags
            });

            const infoText = `╭──⦿【 🎤 ARTIST INFO 】
│
│ 👤 *Name:* ${artistData.name}
│ 👁️ *Listeners:* ${this.formatNumber(artistData.listeners)}
│ ▶️ *Plays:* ${this.formatNumber(artistData.playcount)}
│
╰────────⦿

╭──⦿【 📖 BIOGRAPHY 】
│
│ ${shortBio.split('\n').join('\n│ ')}
│
╰────────⦿

${artistData.tags.length > 0 ? `╭──⦿【 🏷️ GENRES 】
│
│ ${artistData.tags.join(' • ')}
│
╰────────⦿\n\n` : ''}${artistData.similar.length > 0 ? `╭──⦿【 🎵 SIMILAR ARTISTS 】
│
│ ${artistData.similar.join(' • ')}
│
╰────────⦿\n\n` : ''}${artistData.url ? `🔗 *More Info:* ${artistData.url}\n\n` : ''}🌐 *Source:* ${apiUsed}

💫 | [ Amazing Bot 🚀 ]
🔥 | Powered by Ilom`;

            await sock.sendMessage(from, {
                image: artistCanvas,
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

    async createArtistCard({ name, image, listeners, playcount, tags }) {
        const canvas = createCanvas(1200, 800);
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#8e2de2');
        gradient.addColorStop(0.5, '#4a00e0');
        gradient.addColorStop(1, '#ff6b6b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < 100; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 3 + 1;
            const opacity = Math.random() * 0.6 + 0.2;
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.roundRect(ctx, 50, 50, canvas.width - 100, canvas.height - 100, 30);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        this.roundRect(ctx, 50, 50, canvas.width - 100, canvas.height - 100, 30);
        ctx.stroke();

        ctx.font = 'bold 80px Arial';
        const titleGradient = ctx.createLinearGradient(0, 120, canvas.width, 120);
        titleGradient.addColorStop(0, '#ffd700');
        titleGradient.addColorStop(0.5, '#ffed4e');
        titleGradient.addColorStop(1, '#ffd700');
        ctx.fillStyle = titleGradient;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
        ctx.shadowBlur = 20;
        ctx.fillText('🎤 ARTIST INFO', canvas.width / 2, 140);
        ctx.shadowBlur = 0;

        const imageSize = 300;
        const imageX = (canvas.width - imageSize) / 2;
        const imageY = 200;

        ctx.save();
        ctx.beginPath();
        ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        try {
            const artistImage = await loadImage(image);
            ctx.drawImage(artistImage, imageX, imageY, imageSize, imageSize);
        } catch (err) {
            ctx.fillStyle = '#8e2de2';
            ctx.fillRect(imageX, imageY, imageSize, imageSize);
            
            ctx.font = 'bold 120px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(name.charAt(0).toUpperCase(), imageX + imageSize / 2, imageY + imageSize / 2 + 40);
        }

        ctx.restore();

        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2 + 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.roundRect(ctx, 100, 540, canvas.width - 200, 180, 20);
        ctx.fill();

        const infoY = 590;
        const lineHeight = 60;

        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.fillText(name, canvas.width / 2, infoY);

        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#ffffff';
        const statsY = infoY + lineHeight;
        const leftX = canvas.width / 2 - 200;
        const rightX = canvas.width / 2 + 200;

        ctx.textAlign = 'center';
        ctx.fillStyle = '#00ff88';
        ctx.fillText('👁️ ' + this.formatNumber(listeners), leftX, statsY);
        
        ctx.fillStyle = '#ff6b9d';
        ctx.fillText('▶️ ' + this.formatNumber(playcount), rightX, statsY);

        if (tags && tags.length > 0) {
            ctx.font = '24px Arial';
            ctx.fillStyle = '#a0a0a0';
            ctx.textAlign = 'center';
            const tagsText = tags.slice(0, 3).join(' • ');
            ctx.fillText(tagsText, canvas.width / 2, statsY + 50);
        }

        return canvas.toBuffer('image/png');
    },

    formatNumber(num) {
        if (!num || num === 'N/A' || num === '0') return 'N/A';
        const number = parseInt(num);
        if (number >= 1000000) {
            return (number / 1000000).toFixed(1) + 'M';
        } else if (number >= 1000) {
            return (number / 1000).toFixed(1) + 'K';
        }
        return number.toLocaleString();
    },

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
};