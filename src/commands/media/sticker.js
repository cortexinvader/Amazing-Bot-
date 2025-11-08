import fs from 'fs';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp'; // npm install sharp file-type
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

async function createStickerBuffer(mediaBuffer) {
    try {
        // Process image with sharp: resize to 512x512, transparent bg, WebP
        const processedBuffer = await sharp(mediaBuffer)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .webp({ lossless: true })
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

            // Check direct or quoted media
            if (message.message?.imageMessage) {
                mediaMessage = message.message.imageMessage;
            } else if (message.message?.videoMessage) {
                mediaMessage = message.message.videoMessage;
            } else {
                const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quoted?.imageMessage) {
                    mediaMessage = quoted.imageMessage;
                } else if (quoted?.videoMessage) {
                    mediaMessage = quoted.videoMessage;
                }
            }

            if (!mediaMessage) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nReply to an image or video to make a sticker!\n\n💡 Example: Reply with \`${prefix}sticker\``
                }, { quoted: message });
                return;
            }

            // React
            await sock.sendMessage(from, {
                react: { text: '✨', key: message.key }
            });

            // Download to temp
            const tempFile = path.join(TEMP_DIR, `${Date.now()}.tmp`);
            const stream = await sock.downloadAndSaveMediaMessage(mediaMessage, tempFile);
            await new Promise((resolve, reject) => {
                stream.on('end', resolve);
                stream.on('error', reject);
            });

            const mediaBuffer = fs.readFileSync(tempFile);
            const fileType = await fileTypeFromBuffer(mediaBuffer);

            if (!fileType || !['jpg', 'jpeg', 'png', 'gif'].includes(fileType.ext)) {
                cleanTempFile(tempFile);
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nUnsupported format. Use JPG, PNG, or GIF images.`
                }, { quoted: message });
                return;
            }

            // Create sticker (video simplified to static for now)
            const stickerBuffer = await createStickerBuffer(mediaBuffer);

            // Send sticker immediately
            await sock.sendMessage(from, {
                sticker: stickerBuffer,
                mimetype: 'image/webp'
            }, { quoted: message });

            // Success react
            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

            cleanTempFile(tempFile);

        } catch (error) {
            console.error('Sticker command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to create sticker: ${error.message}\n\n💡 Try with a valid image.`
            }, { quoted: message });
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};