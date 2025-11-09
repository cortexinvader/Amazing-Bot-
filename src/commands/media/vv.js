import fs from 'fs';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type'; // npm install file-type
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
    description: 'View view-once media normally (reply to it)',
    usage: 'vv [reply to view once image/video]',
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
                    text: `❌ *Error*\nReply to a view once image/video to view it!\n\n💡 Example: Reply with \`${prefix}vv\``
                }, { quoted: message });
                return;
            }

            let mediaMessage = null;
            let isImage = false;
            let isVideo = false;

            // Handle view once
            if (quoted.viewOnceMessageMessage) {
                const innerMsg = quoted.viewOnceMessageMessage.message;
                if (innerMsg.imageMessage) {
                    mediaMessage = innerMsg.imageMessage;
                    isImage = true;
                } else if (innerMsg.videoMessage) {
                    mediaMessage = innerMsg.videoMessage;
                    isVideo = true;
                }
            } else {
                // Fallback for regular media
                if (quoted.imageMessage) {
                    mediaMessage = quoted.imageMessage;
                    isImage = true;
                } else if (quoted.videoMessage) {
                    mediaMessage = quoted.videoMessage;
                    isVideo = true;
                }
            }

            if (!mediaMessage) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nReply to an image or video (view once preferred).`
                }, { quoted: message });
                return;
            }

            // React
            await sock.sendMessage(from, {
                react: { text: '👁️', key: message.key }
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

            if (!fileType) {
                cleanTempFile(tempFile);
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nInvalid media file.`
                }, { quoted: message });
                return;
            }

            let sendOptions = {};
            const caption = mediaMessage.caption || '';

            if (isImage || fileType.mime.startsWith('image/')) {
                sendOptions = {
                    image: mediaBuffer,
                    mimetype: fileType.mime,
                    caption: caption,
                    viewOnce: false
                };
            } else if (isVideo || fileType.mime.startsWith('video/')) {
                sendOptions = {
                    video: mediaBuffer,
                    mimetype: fileType.mime,
                    caption: caption,
                    viewOnce: false
                };
            } else {
                cleanTempFile(tempFile);
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nUnsupported type. Only images/videos.`
                }, { quoted: message });
                return;
            }

            // Send normally immediately
            await sock.sendMessage(from, sendOptions, { quoted: message });

            // Success react
            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

            cleanTempFile(tempFile);

        } catch (error) {
            console.error('VV command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to open media: ${error.message}`
            }, { quoted: message });
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};