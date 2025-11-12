import fs from 'fs';
import path from 'path';
import fileTypeModule from 'file-type';
const { fileTypeFromBuffer } = fileTypeModule;
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
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

async function streamToBuffer(stream) {
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

async function createImageStickerBuffer(mediaBuffer) {
    const processedBuffer = await sharp(mediaBuffer)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .webp({ lossless: true })
        .toBuffer();
    return processedBuffer;
}

async function createVideoStickerBuffer(mediaBuffer, fileTypeExt) {
    return new Promise((resolve, reject) => {
        const inputPath = path.join(TEMP_DIR, `video_input.${fileTypeExt}`);
        const outputPath = path.join(TEMP_DIR, `sticker_${Date.now()}.webp`);

        fs.writeFileSync(inputPath, mediaBuffer);

        ffmpeg(inputPath)
            .videoFilters(['scale=512:512:force_original_aspect_ratio=decrease', 'fps=10'])
            .outputOptions(['-vcodec libwebp', '-lossless 1', '-loop 0', '-an', '-t 10']) // 10s max, no audio
            .on('error', (err) => {
                cleanTempFile(inputPath);
                reject(err);
            })
            .on('end', () => {
                cleanTempFile(inputPath);
                const stickerBuffer = fs.readFileSync(outputPath);
                cleanTempFile(outputPath);
                resolve(stickerBuffer);
            })
            .save(outputPath);
    });
}

export default {
    name: 'sticker',
    aliases: ['s', 'stik'],
    category: 'media',
    description: 'Create a sticker from replied image, GIF, or short video (<10s)',
    usage: 'sticker [reply to image/video/GIF]',
    example: 'Reply to image/video with sticker',
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
            let isVideo = false;
            let isSticker = false;
            let videoSeconds = 0;
            if (message.message?.imageMessage) {
                mediaMessage = message.message.imageMessage;
            } else if (message.message?.videoMessage) {
                mediaMessage = message.message.videoMessage;
                isVideo = true;
                videoSeconds = mediaMessage.seconds || 0;
            } else {
                const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quoted?.imageMessage) {
                    mediaMessage = quoted.imageMessage;
                } else if (quoted?.videoMessage) {
                    mediaMessage = quoted.videoMessage;
                    isVideo = true;
                    videoSeconds = mediaMessage.seconds || 0;
                } else if (quoted?.stickerMessage && quoted.stickerMessage.isAnimated) {
                    mediaMessage = quoted.stickerMessage;
                    isSticker = true;
                    isVideo = true;
                    videoSeconds = 5;
                }
            }

            if (!mediaMessage) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nReply to an image, GIF, short video (<10s), or animated sticker!\n\n💡 Example: Reply with \`${prefix}sticker\``
                }, { quoted: message });
                return;
            }

            if (isVideo && videoSeconds > 10) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nVideo too long (${videoSeconds}s). Use under 10 seconds.`
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, {
                react: { text: '✨', key: message.key }
            });

            let mediaType = 'image';
            if (isSticker) {
                mediaType = 'sticker';
            } else if (isVideo) {
                mediaType = 'video';
            }
            const stream = await downloadContentFromMessage(mediaMessage, mediaType);
            const mediaBuffer = await streamToBuffer(stream);

            const fileType = await fileTypeFromBuffer(mediaBuffer);

            if (!fileType || (!isVideo && !['jpg', 'jpeg', 'png', 'gif'].includes(fileType.ext))) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nUnsupported format. Use JPG/PNG/GIF images or MP4/WEBM videos.`
                }, { quoted: message });
                return;
            }

            let stickerBuffer;
            let isAnimated = false;

            if (isVideo && ['mp4', 'webm', 'gif'].includes(fileType.ext)) {
                stickerBuffer = await createVideoStickerBuffer(mediaBuffer, fileType.ext);
                isAnimated = true;
            } else {
                stickerBuffer = await createImageStickerBuffer(mediaBuffer);
                isAnimated = false;
            }

            // Send sticker
            await sock.sendMessage(from, {
                sticker: stickerBuffer,
                mimetype: 'image/webp'
            }, { quoted: message });

            // Success react
            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Sticker command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to create sticker: ${error.message}\n\n💡 Ensure FFmpeg for videos.`
            }, { quoted: message });
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};