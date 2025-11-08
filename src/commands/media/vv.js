import fs from 'fs';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
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
    aliases: ['viewonce', 'vo', 'view'],
    category: 'media',
    description: 'View view once media - reply to a view once image/video to open it normally',
    usage: 'vv [reply to view once image/video]',
    example: 'Reply to a view once photo with .vv',
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

    async execute(options) {
        const {
            sock,
            message,
            from,
            sender,
            prefix
        } = options;

        try {
            // Get quoted message (replied to)
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted) {
                return await sock.sendMessage(from, {
                    text: `Reply to a view once image or video to view it!\n\nExample: Reply to view once media with ${prefix}vv`
                }, { quoted: message });
            }

            let mediaMessage = null;
            let isImage = false;
            let isVideo = false;

            // Check if it's a view once message
            if (quoted.viewOnceMessageMessage) {
                // Extract inner message from viewOnceMessage
                const innerMsg = quoted.viewOnceMessageMessage.message;
                if (innerMsg.imageMessage) {
                    mediaMessage = innerMsg.imageMessage;
                    isImage = true;
                } else if (innerMsg.videoMessage) {
                    mediaMessage = innerMsg.videoMessage;
                    isVideo = true;
                }
            } else {
                // Fallback: if not view once, but regular media (for flexibility)
                if (quoted.imageMessage) {
                    mediaMessage = quoted.imageMessage;
                    isImage = true;
                } else if (quoted.videoMessage) {
                    mediaMessage = quoted.videoMessage;
                    isVideo = true;
                }
            }

            if (!mediaMessage) {
                return await sock.sendMessage(from, {
                    text: 'Please reply to an image or video (view once or not).'
                }, { quoted: message });
            }

            // React
            await sock.sendMessage(from, {
                react: { text: '👁️', key: message.key }
            });

            // Download media
            const tempFile = path.join(TEMP_DIR, `${Date.now()}.tmp`);
            const stream = await sock.downloadAndSaveMediaMessage(mediaMessage, tempFile);

            await new Promise((resolve, reject) => {
                stream.on('end', resolve);
                stream.on('error', reject);
            });

            // Read buffer
            const mediaBuffer = fs.readFileSync(tempFile);

            // Validate file type
            const fileType = await fileTypeFromBuffer(mediaBuffer);
            if (!fileType) {
                throw new Error('Invalid media file');
            }

            let sendOptions = {};
            const caption = mediaMessage.caption || '';

            if (isImage || fileType.mime.startsWith('image/')) {
                sendOptions = {
                    image: mediaBuffer,
                    mimetype: fileType.mime,
                    caption: caption,
                    viewOnce: false // Explicitly not view once
                };
            } else if (isVideo || fileType.mime.startsWith('video/')) {
                sendOptions = {
                    video: mediaBuffer,
                    mimetype: fileType.mime,
                    caption: caption,
                    viewOnce: false // Explicitly not view once
                };
            } else {
                throw new Error('Unsupported media type. Only images/videos supported.');
            }

            // Send the media normally
            await sock.sendMessage(from, sendOptions, { quoted: message });

            // Cleanup
            cleanTempFile(tempFile);

            // Success react
            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('VV command error:', error);

            await sock.sendMessage(from, {
                text: `Failed to view media\n\nError: ${error.message}\nTry replying to a valid image/video.`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};