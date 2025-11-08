import fs from 'fs';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp'; // Assume sharp is installed for image processing
import config from '../../config.js';

const STICKER_TMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(STICKER_TMP_DIR)) {
    fs.mkdirSync(STICKER_TMP_DIR, { recursive: true });
}

function cleanTempFile(filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

async function createStickerBuffer(mediaBuffer, isVideo = false) {
    try {
        let processedBuffer;
        if (isVideo) {
            // For videos, would need ffmpeg or similar; placeholder - assume image for simplicity
            // In full impl, use fluent-ffmpeg to extract frame and convert
            processedBuffer = mediaBuffer; // Simplified: treat as image
        } else {
            // Process image with sharp: resize to 512x512, add white bg if transparent
            processedBuffer = await sharp(mediaBuffer)
                .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent bg
                })
                .png() // WebP for stickers, but PNG intermediate
                .webp({ lossless: true }) // Convert to WebP
                .toBuffer();
        }
        return processedBuffer;
    } catch (error) {
        console.error('Sticker processing error:', error);
        throw error;
    }
}

export default {
    name: 'sticker',
    aliases: ['s', 'stik', 'stick'],
    category: 'media',
    description: 'Convert image or video to sticker',
    usage: 'sticker [reply to image/video]',
    example: 'Reply to an image with .sticker',
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

    async execute(options) {
        const {
            sock,
            message,
            from,
            sender,
            store // Assuming store for downloads if needed
        } = options;

        try {
            let mediaMessage = null;
            let isVideo = false;

            // Check if direct media or quoted
            if (message.message?.imageMessage) {
                mediaMessage = message.message.imageMessage;
                isVideo = false;
            } else if (message.message?.videoMessage) {
                mediaMessage = message.message.videoMessage;
                isVideo = true;
            } else {
                // Check quoted
                const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quoted?.imageMessage) {
                    mediaMessage = quoted.imageMessage;
                    isVideo = false;
                } else if (quoted?.videoMessage) {
                    mediaMessage = quoted.videoMessage;
                    isVideo = true;
                }
            }

            if (!mediaMessage) {
                return await sock.sendMessage(from, {
                    text: `Reply to an image or video to create a sticker!\n\nExample: Reply to image with ${options.prefix}sticker`
                }, { quoted: message });
            }

            // React
            await sock.sendMessage(from, {
                react: { text: '✨', key: message.key }
            });

            // Download media
            const tempFile = path.join(STICKER_TMP_DIR, `${Date.now()}.tmp`);
            const stream = await sock.downloadAndSaveMediaMessage(mediaMessage, tempFile);

            await new Promise((resolve, reject) => {
                stream.on('end', resolve);
                stream.on('error', reject);
            });

            // Read buffer
            const mediaBuffer = fs.readFileSync(tempFile);

            // Validate file type
            const fileType = await fileTypeFromBuffer(mediaBuffer);
            if (!fileType || (isVideo && !['mp4', 'webm'].includes(fileType.ext)) || (!isVideo && !['jpg', 'jpeg', 'png', 'gif'].includes(fileType.ext))) {
                throw new Error('Unsupported media type');
            }

            // Create sticker buffer (for video, simplified - in prod, use ffmpeg to gif or frame)
            if (isVideo) {
                // Placeholder: Convert first frame to image sticker
                // Use sharp on a frame; assume we extract frame separately
                // For now, error if video (add ffmpeg dep for full support)
                throw new Error('Video stickers require additional processing (ffmpeg). Use images for now.');
            }

            const stickerBuffer = await createStickerBuffer(mediaBuffer, isVideo);

            // Send sticker
            const stickerOptions = {
                sticker: stickerBuffer,
                mimetype: 'image/webp',
                fileLength: stickerBuffer.length,
                ...(isVideo && { isAnimated: true }), // If animated
                url: mediaMessage.url || undefined,
                caption: mediaMessage.caption || 'Sticker',
                quality: 100
            };

            await sock.sendMessage(from, stickerOptions, { quoted: message });

            // Cleanup
            cleanTempFile(tempFile);

            // Success react
            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Sticker command error:', error);

            await sock.sendMessage(from, {
                text: `Failed to create sticker\n\nError: ${error.message}\nTry with a valid image.`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};