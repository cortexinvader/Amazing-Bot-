import { Sticker, StickerTypes } from "wa-sticker-formatter";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

export default {
    name: 'sticker',
    aliases: ['stik', 's', 'stick'],
    category: 'media',
    description: 'Create a sticker from an image, GIF, or short video',
    usage: 'sticker <reply to media>',
    example: 'sticker (reply to image/video/gif)',
    cooldown: 5,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,

    async execute({ sock, message, from, sender, prefix }) {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            return await sock.sendMessage(from, {
                text: '❌ Please reply to an image, GIF, or short video to create a sticker.\n\n' +
                      '💡 Usage: ' + prefix + 'sticker (reply to media)'
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, {
                react: { text: '⏳', key: message.key }
            });

            let mediaBuffer;
            let mediaType;

            if (quoted.imageMessage) {
                mediaBuffer = await downloadMediaMessage(
                    { message: { imageMessage: quoted.imageMessage } },
                    "buffer",
                    {},
                    { 
                        logger: console,
                        reuploadRequest: sock.updateMediaMessage
                    }
                );
                mediaType = 'image';
            } else if (quoted.videoMessage) {
                const videoSeconds = quoted.videoMessage.seconds || 0;
                
                if (videoSeconds > 10) {
                    await sock.sendMessage(from, {
                        react: { text: '❌', key: message.key }
                    });
                    return await sock.sendMessage(from, {
                        text: '❌ Video too long!\n\n' +
                              '⚠️ Please use a video under 10 seconds.\n' +
                              '📹 Current length: ' + videoSeconds + 's'
                    }, { quoted: message });
                }

                mediaBuffer = await downloadMediaMessage(
                    { message: { videoMessage: quoted.videoMessage } },
                    "buffer",
                    {},
                    { 
                        logger: console,
                        reuploadRequest: sock.updateMediaMessage
                    }
                );
                mediaType = 'video';
            } else if (quoted.stickerMessage) {
                mediaBuffer = await downloadMediaMessage(
                    { message: { stickerMessage: quoted.stickerMessage } },
                    "buffer",
                    {},
                    { 
                        logger: console,
                        reuploadRequest: sock.updateMediaMessage
                    }
                );
                mediaType = 'sticker';
            } else {
                await sock.sendMessage(from, {
                    react: { text: '❌', key: message.key }
                });
                return await sock.sendMessage(from, {
                    text: '❌ Unsupported media type!\n\n' +
                          '✅ Supported: Image, GIF, Video (under 10s)\n' +
                          '💡 Reply to media with: ' + prefix + 'sticker'
                }, { quoted: message });
            }

            if (!mediaBuffer || mediaBuffer.length === 0) {
                throw new Error('Failed to download media');
            }

            const sticker = new Sticker(mediaBuffer, {
                pack: "Created with",
                author: "Ilom",
                type: StickerTypes.FULL,
                quality: 50
            });

            const stickerBuffer = await sticker.toBuffer();

            await sock.sendMessage(from, {
                sticker: stickerBuffer
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Sticker creation error:', error);
            
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });

            await sock.sendMessage(from, {
                text: '❌ Failed to create sticker\n\n' +
                      '⚠️ Error: ' + error.message + '\n\n' +
                      '💡 Make sure you replied to:\n' +
                      '• Image (JPG, PNG)\n' +
                      '• GIF\n' +
                      '• Video (under 10 seconds)'
            }, { quoted: message });
        }
    }
};