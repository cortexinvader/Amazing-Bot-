import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
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
        const inputPath = path.join(TEMP_DIR, `input_${Date.now()}.${fileTypeExt}`);
        const outputPath = path.join(TEMP_DIR, `output_${Date.now()}.gif`);

        fs.writeFileSync(inputPath, inputBuffer);

        ffmpeg(inputPath)
            .output(outputPath)
            .outputFormat('gif')
            .videoFilter('scale=320:-1:flags=lanczos,fps=10')
            .outputOptions(['-y'])
            .on('error', (err) => {
                cleanTempFile(inputPath);
                cleanTempFile(outputPath);
                reject(err);
            })
            .on('end', () => {
                cleanTempFile(inputPath);
                try {
                    const gifBuffer = fs.readFileSync(outputPath);
                    cleanTempFile(outputPath);
                    resolve(gifBuffer);
                } catch (readErr) {
                    cleanTempFile(outputPath);
                    reject(readErr);
                }
            })
            .run();
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

            await sock.sendMessage(from, {
                react: { text: '🎬', key: message.key }
            });

            const tempFile = path.join(TEMP_DIR, `${Date.now()}.tmp`);
            const savedPath = await sock.downloadAndSaveMediaMessage(mediaMessage, tempFile);
            
            const mediaBuffer = fs.readFileSync(savedPath);
            const { fileTypeFromBuffer } = await import('file-type');
            const detectedType = await fileTypeFromBuffer(mediaBuffer);
            const supportedExts = ['mp4', 'webm', 'avi', 'mov', 'jpg', 'jpeg', 'png', 'gif'];

            if (!detectedType || !supportedExts.includes(detectedType.ext)) {
                cleanTempFile(savedPath);
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nUnsupported format. Use MP4/WEBM videos or JPG/PNG images.`
                }, { quoted: message });
                return;
            }

            const gifBuffer = await convertToGif(mediaBuffer, detectedType.ext);

            await sock.sendMessage(from, {
                video: gifBuffer,
                gifPlayback: true,
                caption: mediaMessage.caption ? `GIF: ${mediaMessage.caption}` : 'Converted to GIF'
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

            cleanTempFile(savedPath);

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
