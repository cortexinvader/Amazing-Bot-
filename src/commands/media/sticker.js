import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import config from '../../config.js';

const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function cleanTempFile(filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

async function downloadMedia(message) {
    try {
        const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
        const buffer = await downloadMediaMessage(message, 'buffer', {});
        return buffer;
    } catch (error) {
        console.error('Media download error:', error);
        throw error;
    }
}

async function createStickerBuffer(mediaBuffer) {
    try {
        const processedBuffer = await sharp(mediaBuffer)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp({ quality: 100 })
            .toBuffer();
        return processedBuffer;
    } catch (error) {
        console.error('Sticker processing error:', error);
        throw error;
    }
}

export default {
    name: 'sticker',
    aliases: ['s', 'stik'],
    category: 'media',
    description: 'Convert replied image/video to sticker',
    usage: 'sticker [reply to image/video]',
    example: 'Reply to image with sticker',
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
    supportsChat: true,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, from, prefix }) {
        try {
            let mediaMessage = null;
            let isQuoted = false;

            const msgContent = message.message;
            
            if (!msgContent) {
                await sock.sendMessage(from, {
                    text: `Reply to an image or video to make a sticker\n\nExample: Reply with ${prefix}sticker`
                }, { quoted: message });
                return;
            }

            if (msgContent.imageMessage) {
                mediaMessage = message;
            } else if (msgContent.videoMessage) {
                mediaMessage = message;
            } else if (msgContent.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quoted = msgContent.extendedTextMessage.contextInfo.quotedMessage;
                if (quoted.imageMessage || quoted.videoMessage) {
                    mediaMessage = {
                        message: quoted,
                        key: message.key
                    };
                    isQuoted = true;
                }
            }

            if (!mediaMessage) {
                await sock.sendMessage(from, {
                    text: `Reply to an image or video to make a sticker\n\nExample: Reply with ${prefix}sticker`
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, {
                react: { text: '⏳', key: message.key }
            });

            const buffer = await downloadMedia(mediaMessage);

            if (!buffer || buffer.length === 0) {
                await sock.sendMessage(from, {
                    text: `Failed to download media. Please try again.`
                }, { quoted: message });
                return;
            }

            const { fileTypeFromBuffer } = await import('file-type');
            const detectedType = await fileTypeFromBuffer(buffer);

            if (!detectedType) {
                await sock.sendMessage(from, {
                    text: `Could not detect file type. Please use a valid image.`
                }, { quoted: message });
                return;
            }

            const validTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            if (!validTypes.includes(detectedType.ext)) {
                await sock.sendMessage(from, {
                    text: `Unsupported format: ${detectedType.ext}\n\nSupported formats: JPG, PNG, GIF, WEBP`
                }, { quoted: message });
                return;
            }

            const stickerBuffer = await createStickerBuffer(buffer);

            await sock.sendMessage(from, {
                sticker: stickerBuffer
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Sticker command error:', error);
            
            await sock.sendMessage(from, {
                text: `Failed to create sticker: ${error.message}`
            }, { quoted: message });
            
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};