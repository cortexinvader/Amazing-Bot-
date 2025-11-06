import axios from 'axios';

export default {
    name: 'ssweb',
    aliases: ['screenshot', 'webss'],
    category: 'utility',
    description: 'Takes a screenshot of a website and sends the image.',
    usage: 'ssweb <url>',
    example: 'ssweb https://example.com',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    maxArgs: 1,
    typing: false,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, from }) {
        const url = args[0];

        if (!url.startsWith('http')) {
            return await sock.sendMessage(from, {
                text: '❗ Please provide a valid URL starting with http or https.'
            }, { quoted: message });
        }

        try {
            const waitMsg = await sock.sendMessage(from, {
                text: `🕵️‍♂️ Taking screenshot of *url*...`
            ,  quoted: message );const apiUrl = `https://arychauhann.onrender.com/api/ssweb?url={encodeURIComponent(url)}&type=desktop`;

            const response = await axios.get(apiUrl, {
                responseType: 'arraybuffer'
            });

            const imageBuffer = Buffer.from(response.data, 'binary');

            await sock.sendMessage(from, {
                image: imageBuffer,
                caption: `🖼️ Screenshot of: *url*`
            ,  quoted: message );

            await sock.sendMessage(from,  delete: waitMsg.key );

         catch (err) 
            console.error('ssweb error:', err);
            await sock.sendMessage(from, 
                text: `❌ Failed to capture screenshot.:{err.message}`
            }, { quoted: message });
        }
    }
};