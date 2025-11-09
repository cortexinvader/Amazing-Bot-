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
            let mediaCaption = '';

            const msgContent = message.message;
            
            if (!msgContent) {
                await sock.sendMessage(from, {
                    text: `Reply to a video or image to convert to GIF\n\nExample: Reply with ${prefix}togif`
                }, { quoted: message });
                return;
            }

            if (msgContent.videoMessage) {
                mediaMessage = message;
                isVideo = true;
                mediaCaption = msgContent.videoMessage.caption || '';
            } else if (msgContent.imageMessage) {
                mediaMessage = message;
                isImage = true;
                mediaCaption = msgContent.imageMessage.caption || '';
            } else if (msgContent.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quoted = msgContent.extendedTextMessage.contextInfo.quotedMessage;
                if (quoted.videoMessage) {
                    mediaMessage = {
                        message: quoted,
                        key: message.key
                    };
                    isVideo = true;
                    mediaCaption = quoted.videoMessage.caption || '';
                } else if (quoted.imageMessage) {
                    mediaMessage = {
                        message: quoted,
                        key: message.key
                    };
                    isImage = true;
                    mediaCaption = quoted.imageMessage.caption || '';
                }
            }

            if (!mediaMessage) {
                await sock.sendMessage(from, {
                    text: `Reply to a video or image to convert to GIF\n\nExample: Reply with ${prefix}togif`
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
                    text: `Could not detect file type. Please use a valid video or image.`
                }, { quoted: message });
                return;
            }

            const supportedExts = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'jpg', 'jpeg', 'png', 'webp'];
            if (!supportedExts.includes(detectedType.ext)) {
                await sock.sendMessage(from, {
                    text: `Unsupported format: ${detectedType.ext}\n\nSupported formats: MP4, WEBM, AVI, MOV, JPG, PNG`
                }, { quoted: message });
                return;
            }

            const gifBuffer = await convertToGif(buffer, detectedType.ext);

            await sock.sendMessage(from, {
                video: gifBuffer,
                gifPlayback: true,
                caption: mediaCaption ? `GIF: ${mediaCaption}` : 'Converted to GIF'
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('ToGIF command error:', error);
            
            await sock.sendMessage(from, {
                text: `Failed to convert to GIF: ${error.message}\n\nMake sure FFmpeg is installed on your system.`
            }, { quoted: message });
            
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};