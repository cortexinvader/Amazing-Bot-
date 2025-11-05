import sharp from 'sharp';

export default {
    name: 'sticker',
    aliases: ['s', 'stick'],
    category: 'media',
    description: 'Convert replied image to sticker',
    usage: 'sticker (reply to image)',
    example: 'Reply to an image and use .sticker',
    cooldown: 5,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: true,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, from, prefix }) {
        try {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted?.imageMessage) {
                return await sock.sendMessage(from, {
                    text: `❌ Reply to an image to make a sticker!\n\n📜 *Usage:* ${prefix}sticker (reply to image)\n\n💡 Works best with square/clear images.`
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '✨', key: message.key }
            });

            const processingMsg = await sock.sendMessage(from, {
                text: '🎨 Creating sticker...'
            }, { quoted: message });

            // Download media buffer
            const mediaBuffer = await sock.downloadMediaMessage(quoted);

            // Process with sharp: resize to 512x512, convert to webp
            const stickerBuffer = await sharp(mediaBuffer)
                .resize(512, 512, { fit: 'cover', position: 'center' })
                .webp({ quality: 80 })
                .toBuffer();

            await sock.sendMessage(from, { delete: processingMsg.key });

            await sock.sendMessage(from, {
                sticker: stickerBuffer,
                mimetype: 'image/webp'
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Sticker command error:', error);
            await sock.sendMessage(from, {
                text: `❌ Failed to create sticker.\n\n💡 Error: ${error.message}\nTry with a different image.`
            }, { quoted: message });
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};