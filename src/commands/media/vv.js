import fs from 'fs';
import path from 'path'; // npm install file-type
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

export default {
    name: 'vv',
    aliases: ['viewonce', 'vo'],
    category: 'media',
    description: 'Extract and view view-once media normally (images/videos/audio) - reply to it',
    usage: 'vv [reply to view once image/video/audio]',
    example: 'Reply to view once with vv',
    cooldown: 3,
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
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nReply to a view once image/video/audio to extract and view it!\n\n💡 Example: Reply with \`${prefix}vv\``
                }, { quoted: message });
                return;
            }

            let mediaMessage = null;
            let isImage = false;
            let isVideo = false;
            let isAudio = false;

            // Handle view once extraction
            if (quoted.viewOnceMessageMessage) {
                const innerMsg = quoted.viewOnceMessageMessage.message;
                if (innerMsg.imageMessage) {
                    mediaMessage = innerMsg.imageMessage;
                    isImage = true;
                } else if (innerMsg.videoMessage) {
                    mediaMessage = innerMsg.videoMessage;
                    isVideo = true;
                } else if (innerMsg.audioMessage || innerMsg.voiceMessage) {
                    mediaMessage = innerMsg.audioMessage || innerMsg.voiceMessage;
                    isAudio = true;
                }
            } else {
                // Fallback for regular quoted media (non-view once)
                if (quoted.imageMessage) {
                    mediaMessage = quoted.imageMessage;
                    isImage = true;
                } else if (quoted.videoMessage) {
                    mediaMessage = quoted.videoMessage;
                    isVideo = true;
                } else if (quoted.audioMessage || quoted.voiceMessage) {
                    mediaMessage = quoted.audioMessage || quoted.voiceMessage;
                    isAudio = true;
                }
            }

            if (!mediaMessage) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nReply to an image, video, or audio (view once preferred) to extract.`
                }, { quoted: message });
                return;
            }

            // React
            await sock.sendMessage(from, {
                react: { text: '👁️', key: message.key }
            });

            // Download/extract to temp
            const tempFile = path.join(TEMP_DIR, `${Date.now()}.tmp`);
            const savedPath = await sock.downloadAndSaveMediaMessage(mediaMessage, tempFile);
            
            const mediaBuffer = fs.readFileSync(savedPath);
            const { fileTypeFromBuffer } = await import('file-type');
            const detectedType = await fileTypeFromBuffer(mediaBuffer);

            if (!detectedType) {
                cleanTempFile(savedPath);
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nInvalid media file - could not extract.`
                }, { quoted: message });
                return;
            }

            let sendOptions = {};
            const caption = mediaMessage.caption || 'Extracted from View Once';

            if (isImage || detectedType.mime.startsWith('image/')) {
                sendOptions = {
                    image: mediaBuffer,
                    mimetype: detectedType.mime,
                    caption: caption,
                    viewOnce: false
                };
            } else if (isVideo || detectedType.mime.startsWith('video/')) {
                sendOptions = {
                    video: mediaBuffer,
                    mimetype: detectedType.mime,
                    caption: caption,
                    viewOnce: false
                };
            } else if (isAudio || detectedType.mime.startsWith('audio/')) {
                sendOptions = {
                    audio: mediaBuffer,
                    mimetype: detectedType.mime || 'audio/ogg', // Default to ogg for voice notes
                    ptt: false, // Send as normal audio, not voice note
                    caption: caption
                };
            } else {
                cleanTempFile(savedPath);
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nUnsupported type. Only images/videos/audio can be extracted.`
                }, { quoted: message });
                return;
            }

            // Send extracted media immediately (as normal, non-view once)
            await sock.sendMessage(from, sendOptions, { quoted: message });

            // Success react
            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

            cleanTempFile(savedPath);

        } catch (error) {
            console.error('VV command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to extract media: ${error.message}`
            }, { quoted: message });
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};