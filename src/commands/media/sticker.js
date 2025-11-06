export default {
    name: 'sticker',
    aliases: ['stik', 's'],
    category: 'media',
    description: 'Convert an image to sticker',
    usage: 'sticker',
    example: 'Reply to an image with: sticker',
    cooldown: 5,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: false,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: true,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, from }) {
        try {
            const quoted = message.quoted;
            if (!quoted || quoted.type !== 'imageMessage') {
                return await sock.sendMessage(from, {
                    text: '❗Please *reply to an image* to convert it to a sticker.'
                }, { quoted: message });
            }

            const mediaBuffer = await sock.downloadMediaMessage(quoted);
            if (!mediaBuffer) {return await sock.sendMessage(from, {
                    text: '❌ Failed to download the image. Try again.'
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                sticker: mediaBuffer
            }, { quoted: message });

        } catch (error) {
            console.error('Sticker command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Command Error*\nAn error occurred while executing this command.\n\n*Command:* sticker\n*Error:* ${error.message}`
            }, { quoted: message });
        }
    }
};