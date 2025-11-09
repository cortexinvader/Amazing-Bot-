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

async function convertToMp3(inputBuffer, fileTypeExt) {
    return new Promise((resolve, reject) => {
        const inputPath = path.join(TEMP_DIR, `input_${Date.now()}.${fileTypeExt}`);
        const outputPath = path.join(TEMP_DIR, `output_${Date.now()}.mp3`);

        fs.writeFileSync(inputPath, inputBuffer);

        ffmpeg(inputPath)
            .audioCodec('libmp3lame')
            .audioBitrate(128)
            .format('mp3')
            .on('error', (err) => {
                cleanTempFile(inputPath);
                cleanTempFile(outputPath);
                reject(err);
            })
            .on('end', () => {
                cleanTempFile(inputPath);
                const mp3Buffer = fs.readFileSync(outputPath);
                cleanTempFile(outputPath);
                resolve(mp3Buffer);
            })
            .save(outputPath);
    });
}

export default {
    name: 'tomp3',
    aliases: ['mp3', 'toaudio'],
    category: 'media',
    description: 'Convert replied voice/video/audio to MP3',
    usage: 'tomp3 [reply to voice/video/audio]',
    example: 'Reply to voice with tomp3',
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
            let mediaCaption = '';

            const msgContent = message.message;
            
            if (!msgContent) {
                await sock.sendMessage(from, {
                    text: `Reply to voice, audio, or video to convert to MP3\n\nExample: Reply with ${prefix}tomp3`
                }, { quoted: message });
                return;
            }

            if (msgContent.audioMessage) {
                mediaMessage = message;
                mediaCaption = msgContent.audioMessage.caption || '';
            } else if (msgContent.videoMessage) {
                mediaMessage = message;
                mediaCaption = msgContent.videoMessage.caption || '';
            } else if (msgContent.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quoted = msgContent.extendedTextMessage.contextInfo.quotedMessage;
                if (quoted.audioMessage) {
                    mediaMessage = {
                        message: quoted,
                        key: message.key
                    };
                    mediaCaption = quoted.audioMessage.caption || '';
                } else if (quoted.videoMessage) {
                    mediaMessage = {
                        message: quoted,
                        key: message.key
                    };
                    mediaCaption = quoted.videoMessage.caption || '';
                }
            }

            if (!mediaMessage) {
                await sock.sendMessage(from, {
                    text: `Reply to voice, audio, or video to convert to MP3\n\nExample: Reply with ${prefix}tomp3`
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
                    text: `Could not detect file type. Please use a valid audio or video file.`
                }, { quoted: message });
                return;
            }

            const supportedExts = ['ogg', 'opus', 'mp4', 'webm', 'm4a', 'mp3', 'wav', 'avi', 'mov', 'mkv', 'flv'];
            if (!supportedExts.includes(detectedType.ext)) {
                await sock.sendMessage(from, {
                    text: `Unsupported format: ${detectedType.ext}\n\nSupported formats: OGG, MP4, WEBM, M4A, WAV`
                }, { quoted: message });
                return;
            }

            const mp3Buffer = await convertToMp3(buffer, detectedType.ext);

            await sock.sendMessage(from, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('ToMP3 command error:', error);
            
            await sock.sendMessage(from, {
                text: `Failed to convert to MP3: ${error.message}\n\nMake sure FFmpeg is installed on your system.`
            }, { quoted: message });
            
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};