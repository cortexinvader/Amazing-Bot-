import fs from 'fs';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
// Note: Requires fluent-ffmpeg installed for audio conversion (npm i fluent-ffmpeg)
// Also, ffmpeg binary must be available in PATH or configured
import ffmpeg from 'fluent-ffmpeg';
import config from '../../config.js';

const AUDIO_TMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(AUDIO_TMP_DIR)) {
    fs.mkdirSync(AUDIO_TMP_DIR, { recursive: true });
}

function cleanTempFile(filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

async function convertToMp3(inputBuffer, fileTypeExt) {
    return new Promise((resolve, reject) => {
        const inputPath = path.join(AUDIO_TMP_DIR, `input.${fileTypeExt}`);
        const outputPath = path.join(AUDIO_TMP_DIR, `output_${Date.now()}.mp3`);

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
    name: 'tomp3',
    aliases: ['mp3', 'audio', 'toaudio'],
    category: 'media',
    description: 'Convert voice note, video, or audio to MP3',
    usage: 'tom p3 [reply to voice/video/audio]',
    example: 'Reply to a voice note with .tom p3',
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
            let isVoice = false;
            let isVideo = false;

            // Check if direct media or quoted
            if (message.message?.audioMessage) {
                mediaMessage = message.message.audioMessage;
                isVoice = true;
            } else if (message.message?.voiceMessage) {
                mediaMessage = message.message.voiceMessage;
                isVoice = true;
            } else if (message.message?.videoMessage) {
                mediaMessage = message.message.videoMessage;
                isVideo = true;
            } else {
                // Check quoted
                const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quoted?.audioMessage || quoted?.voiceMessage) {
                    mediaMessage = quoted.audioMessage || quoted.voiceMessage;
                    isVoice = true;
                } else if (quoted?.videoMessage) {
                    mediaMessage = quoted.videoMessage;
                    isVideo = true;
                }
            }

            if (!mediaMessage) {
                return await sock.sendMessage(from, {
                    text: `Reply to a voice note, audio, or video to convert to MP3!\n\nExample: Reply to voice with ${options.prefix}tom p3`
                }, { quoted: message });
            }

            // React
            await sock.sendMessage(from, {
                react: { text: '🎵', key: message.key }
            });

            // Download media
            const tempFile = path.join(AUDIO_TMP_DIR, `${Date.now()}.tmp`);
            const stream = await sock.downloadAndSaveMediaMessage(mediaMessage, tempFile);

            await new Promise((resolve, reject) => {
                stream.on('end', resolve);
                stream.on('error', reject);
            });

            // Read buffer
            const mediaBuffer = fs.readFileSync(tempFile);

            // Validate file type
            const fileType = await fileTypeFromBuffer(mediaBuffer);
            const supportedExts = ['ogg', 'mp4', 'webm', 'm4a', 'mp3', 'wav']; // Common audio/video
            if (!fileType || !supportedExts.includes(fileType.ext)) {
                throw new Error('Unsupported media type. Use voice notes, audio, or videos.');
            }

            // Convert to MP3
            const mp3Buffer = await convertToMp3(mediaBuffer, fileType.ext);

            // Send MP3
            const audioOptions = {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: false, // Not voice note
                fileLength: mp3Buffer.length,
                caption: mediaMessage.caption ? `Converted to MP3: ${mediaMessage.caption}` : 'Converted to MP3'
            };

            await sock.sendMessage(from, audioOptions, { quoted: message });

            // Cleanup
            cleanTempFile(tempFile);

            // Success react
            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('To MP3 command error:', error);

            await sock.sendMessage(from, {
                text: `Failed to convert to MP3\n\nError: ${error.message}\nTry with a valid voice/audio/video.`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};