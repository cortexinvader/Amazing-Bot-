import axios from 'axios';

export default {
    name: 'flux',
    aliases: ['fluxgen', 'fluximg'],
    category: 'ai',
    description: 'Generate an AI image using Flux Pro based on your prompt.',
    usage: 'flux <your prompt>',
    example: 'flux a futuristic cyberpunk city at night',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    typing: true,

    async execute({ sock, message, args, prefix, from }) {
        const prompt = args.join(' ');

        try {
            // React to user
            await sock.sendMessage(from, {
                react: { text: '🎨', key: message.key }
            });

            // Notify generation
            const waitMsg = await sock.sendMessage(from, {
                text: `🧠 *Generating image with Flux Pro AI...*\n\n_This may take a few seconds._`
            }, { quoted: message });

            // Call the API
            const response = await axios.get(`https://arychauhann.onrender.com/api/fluxpro?prompt=${encodeURIComponent(prompt)}`);

            if (!response.data || !response.data.url) {await sock.sendMessage(from, 
                    text: `❌ *Error* to generate image. Please try again later.`
                ,  quoted: message );
                return;
            

            const imageUrl = response.data.url;

            // Delete "generating" message
            await sock.sendMessage(from,  delete: waitMsg.key );

            // Send image result
            await sock.sendMessage(from, 
                image:  url: imageUrl ,
                caption: `✨ *Flux AI Image Generated* ✨` +
                         `🧠 *Prompt:* _{prompt}_\n` +
                         `🖼️ *Model:* Flux Pro AI\n` +
                         `⏱️ Generated in seconds\n\n` +
                         `🔁 Want another one?\nUse *${prefix}flux <your prompt>*`,
                contextInfo: {
                    externalAdReply: {
                        title: 'Flux Pro AI Generator',
                        body: '💞I',
                        thumbnailUrl: imageUrl,
                        sourceUrl: 'https://arychauhann.onrender.com',
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        showAdAttribution: true
                    }
                }console.error('Flux command error:', error.message);
            await sock.sendMessage(from, 
                text: `❌ *Error* went wrong._{error.message}_`
            }, { quoted: message });
        }
    }
};