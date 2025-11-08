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

async function convertToMp3(inputBuffer, fileTypeExt) {
    return new Promise((resolve, reject) => {
        const inputPath = path.join(TEMP_DIR, `input.${fileTypeExt}`);
        const outputPath = path.join(TEMP_DIR, `output_${Date.now()}.mp3`);

        fs.writeFileSync(inputPath, inputBuffer);

        ffmpeg(inputPath)
            .audioCodec('libmp3lame')
            .audioBitrate(128)
            .format('mp3')
            .on('error', (err) => {
                cleanTempFile(inputPath);
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
    name: 'tom p3',
    aliases: ['mp3', 'toaudio'],
    category: 'media',
    description: 'Convert replied voice/video/audio to MP3',
    usage: 'tom p3 [reply to voice/video/audio]',
    example: 'Reply to voice with tom p3',
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
            if (message.message?.audioMessage || message.message?.voiceMessage) {
                mediaMessage = message.message.audioMessage || message.message.voiceMessage;
            } else if (message.message?.videoMessage) {
                mediaMessage = message.message.videoMessage;
            } else {
                const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quoted?.audioMessage || quoted?.voiceMessage) {
                    mediaMessage = quoted.audioMessage || quoted.voiceMessage;
                } else if (quoted?.videoMessage) {
                    mediaMessage = quoted.videoMessage;
                }
            }

            if (!mediaMessage) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nReply to voice, audio, or video to convert to MP3!\n\n💡 Example: Reply with \`${prefix}tom p3\``
                }, { quoted: message });
                return;
            }

            // React
            await sock.sendMessage(from, {
                react: { text: '🎵', key: message.key }
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
            const supportedExts = ['ogg', 'mp4', 'webm', 'm4a', 'mp3', 'wav'];

            if (!fileType || !supportedExts.includes(fileType.ext)) {
                cleanTempFile(tempFile);
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nUnsupported format. Use OGG, MP4, or similar audio/video.`
                }, { quoted: message });
                return;
            }

            // Convert
            const mp3Buffer = await convertToMp3(mediaBuffer, fileType.ext);

            // Send MP3 immediately
            await sock.sendMessage(from, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                caption: mediaMessage.caption ? `MP3: ${mediaMessage.caption}` : 'Converted to MP3'
            }, { quoted: message });

            // Success react
            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

            cleanTempFile(tempFile);

        } catch (error) {
            console.error('ToMP3 command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to convert: ${error.message}\n\n💡 Ensure FFmpeg is installed.`
            }, { quoted: message });
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};