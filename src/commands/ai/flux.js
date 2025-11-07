import axios from 'axios';

export default {
    name: 'flux',
    aliases: ['img', 'generate'],
    category: 'ai',
    description: 'Generate image using Flux AI from prompt.',
    usage: 'flux <prompt>',
    example: 'flux a cute cat in space',
    cooldown: 10,
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

    async execute({ sock, message, args, from }) {
        const prompt = args.join(' ');

        if (!prompt.trim()) {
            return await sock.sendMessage(from, {
                text: '❗ Please provide a prompt for image generation.'
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

            const apiUrl = `https://arychauhann.onrender.com/api/fluxpro?prompt=${encodeURIComponent(prompt)}`;

            // First, get the response to check if it's a URL or direct image
            const response = await axios.get(apiUrl, {
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            let imageBuffer;
            const data = response.data;

            // Assuming API returns direct image buffer or {image: 'url'}
            if (typeof data === 'string' && data.startsWith('http')) {
                // If URL, download the image
                const imgResponse = await axios.get(data, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });
                imageBuffer = imgResponse.data;
            } else if (Buffer.isBuffer(data)) {
                imageBuffer = data;
            } else {
                throw new Error('Invalid image response from API');
            }

            await sock.sendMessage(from, {
                image: imageBuffer,
                caption: `🎨 *Flux Generated:* ${prompt}`
            }, { quoted: message });

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

        } catch (err) {
            console.error('Flux command error:', err);
            await sock.sendMessage(from, {
                text: `❌ Image generation failed: ${err.message}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};