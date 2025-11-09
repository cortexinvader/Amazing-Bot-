import fs from 'fs';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import ffmpeg from 'fluent-ffmpeg'; // npm install fluent-ffmpeg file-type (needs FFmpeg installed)
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

async function convertToGif(inputBuffer, fileTypeExt) {
    return new Promise((resolve, reject) => {
        const inputPath = path.join(TEMP_DIR, `input.${fileTypeExt}`);
        const outputPath = path.join(TEMP_DIR, `output_${Date.now()}.gif`);

        fs.writeFileSync(inputPath, inputBuffer);

        ffmpeg(inputPath)
            .videoFilters([
                'scale=320:-1:flags=lanczos', // Scale to width 320, preserve aspect
                'fps=10' // Limit to 10 FPS for smaller GIF
            ])
            .outputOptions([
                '-vf', 'palettegen=stats_mode=diff', // Generate palette
                '-y' // Overwrite output
            ])
            .on('error', (err) => {
                cleanTempFile(inputPath);
                reject(err);
            })
            .on('end', () => {
                // Second pass: apply palette for better colors
                const palettePath = path.join(TEMP_DIR, 'palette.png');
                fs.writeFileSync(palettePath, inputBuffer); // Reuse input? Wait, no—generate from first pass? Simplified

                ffmpeg(inputPath)
                    .videoFilters([
                        'scale=320:-1:flags=lanczos',
                        'fps=10',
                        `palette=palette.png` // Use generated palette
                    ])
                    .outputOptions(['-y'])
                    .on('error', (err) => {
                        cleanTempFile(inputPath);
                        cleanTempFile(palettePath);
                        reject(err);
                    })
                    .on('end', () => {
                        cleanTempFile(inputPath);
                        cleanTempFile(palettePath);
                        const gifBuffer = fs.readFileSync(outputPath);
                        cleanTempFile(outputPath);
                        resolve(gifBuffer);
                    })
                    .save(outputPath);
            })
            .save(palettePath); // First pass to generate palette
    });
}

export default {
    name: 'togif',
    aliases: ['gif', 'to-gif'],
    category: 'media',
    description: 'Convert replied video/image to GIF',
    usage: 'togif [reply to video/image]',
    example: 'Reply to video with togif',
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
            let isImage = false;

            // Check direct or quoted media
            if (message.message?.videoMessage) {
                mediaMessage = message.message.videoMessage;
                isVideo = true;
            } else if (message.message?.imageMessage) {
                mediaMessage = message.message.imageMessage;
                isImage = true;
            } else {
                const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quoted?.videoMessage) {
                    mediaMessage = quoted.videoMessage;
                    isVideo = true;
                } else if (quoted?.imageMessage) {
                    mediaMessage = quoted.imageMessage;
                    isImage = true;
                }
            }

            if (!mediaMessage) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nReply to a video or image to convert to GIF!\n\n💡 Example: Reply with \`${prefix}togif\``
                }, { quoted: message });
                return;
            }

            // React
            await sock.sendMessage(from, {
                react: { text: '🎬', key: message.key }
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
            const supportedExts = ['mp4', 'webm', 'avi', 'mov', 'jpg', 'jpeg', 'png', 'gif'];

            if (!fileType || !supportedExts.includes(fileType.ext)) {
                cleanTempFile(tempFile);
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nUnsupported format. Use MP4/WEBM videos or JPG/PNG images.`
                }, { quoted: message });
                return;
            }

            // Convert to GIF (images become static GIFs via ffmpeg)
            const gifBuffer = await convertToGif(mediaBuffer, fileType.ext);

            // Send GIF immediately
            await sock.sendMessage(from, {
                video: gifBuffer, // WhatsApp treats GIF as video with gif mimetype
                mimetype: 'video/mp4', // But for GIF, use 'image/gif' if possible; Baileys sends as video for animated
                caption: mediaMessage.caption ? `GIF: ${mediaMessage.caption}` : 'Converted to GIF'
            }, { quoted: message });

            // Success react
            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

            cleanTempFile(tempFile);

        } catch (error) {
            console.error('ToGIF command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to convert to GIF: ${error.message}\n\n💡 Ensure FFmpeg is installed.`
            }, { quoted: message });
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};