import fs from 'fs';
import path from 'path';
import fileTypeModule from 'file-type';
const { fileTypeFromBuffer } = fileTypeModule;
import ffmpeg from 'fluent-ffmpeg'; // npm install fluent-ffmpeg file-type (needs FFmpeg)
import { downloadContentFromMessage } from '@whiskeysockets/baileys'; // Import directly
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

async function convertToMp3(inputBuffer, fileTypeExt, isVideo = false) {
    return new Promise((resolve, reject) => {
        const inputPath = path.join(TEMP_DIR, `input.${fileTypeExt}`);
        const outputPath = path.join(TEMP_DIR, `output_${Date.now()}.mp3`);

        fs.writeFileSync(inputPath, inputBuffer);

        let command = ffmpeg(inputPath)
            .audioCodec('libmp3lame')
            .audioBitrate(128)
            .format('mp3');

        if (isVideo) {
            command = command.noVideo(); // Extract audio only
        }

        command
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
    description: 'Convert replied voice/video/audio to MP3 (extracts audio from videos)',
    usage: 'tom p3 [reply to voice/video/audio]',
    example: 'Reply to voice/video with tom p3',
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
            let mediaMsg = message.message;
            let isVideo = false;

            // Get media from direct or quoted
            if (message.message.extendedTextMessage?.contextInfo?.quotedMessage) {
                mediaMsg = message.message.extendedTextMessage.contextInfo.quotedMessage;
            }

            const mediaKey = Object.keys(mediaMsg)[0];
            if (!mediaKey) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nReply to voice, audio, or video to convert to MP3!\n\n💡 Example: Reply with \`${prefix}tom p3\``
                }, { quoted: message });
                return;
            }

            const mediaType = mediaMsg[mediaKey];
            if (mediaType.audioMessage || mediaType.voiceMessage) {
                // Audio/voice
            } else if (mediaType.videoMessage) {
                isVideo = true;
            } else {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nUnsupported media. Use voice, audio, or video.`
                }, { quoted: message });
                return;
            }

            // React
            await sock.sendMessage(from, {
                react: { text: '🎵', key: message.key }
            });

            // Download with correct method
            const mediaBuffer = await downloadContentFromMessage(mediaMsg, 'buffer');
            const fileType = await fileTypeFromBuffer(mediaBuffer);
            const supportedExts = ['ogg', 'mp3', 'm4a', 'wav', 'mp4', 'webm'];

            if (!fileType || !supportedExts.includes(fileType.ext)) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nUnsupported format. Try OGG/MP3 for audio or MP4 for video.`
                }, { quoted: message });
                return;
            }

            // Convert
            const mp3Buffer = await convertToMp3(mediaBuffer, fileType.ext, isVideo);

            // Send MP3
            await sock.sendMessage(from, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: false, // Normal audio
                caption: mediaType.caption ? `MP3: ${mediaType.caption}` : 'Converted to MP3'
            }, { quoted: message });

            // Success react
            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('ToMP3 command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to convert to MP3: ${error.message}\n\n💡 Check FFmpeg install & media format.`
            }, { quoted: message });
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};