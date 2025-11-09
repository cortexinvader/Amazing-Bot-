import fs from 'fs';
import path from 'path';
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
            const msgContent = message.message;
            
            if (!msgContent || !msgContent.extendedTextMessage?.contextInfo?.quotedMessage) {
                await sock.sendMessage(from, {
                    text: `Reply to a view once image/video/audio to extract and view it\n\nExample: Reply with ${prefix}vv`
                }, { quoted: message });
                return;
            }

            const quoted = msgContent.extendedTextMessage.contextInfo.quotedMessage;
            
            let mediaMessage = null;
            let isImage = false;
            let isVideo = false;
            let isAudio = false;
            let mediaCaption = '';

            if (quoted.viewOnceMessageV2 || quoted.viewOnceMessage || quoted.viewOnceMessageV2Extension) {
                const viewOnceMsg = quoted.viewOnceMessageV2?.message || 
                                   quoted.viewOnceMessage?.message || 
                                   quoted.viewOnceMessageV2Extension?.message;
                
                if (viewOnceMsg) {
                    if (viewOnceMsg.imageMessage) {
                        mediaMessage = {
                            message: { imageMessage: viewOnceMsg.imageMessage },
                            key: message.key
                        };
                        isImage = true;
                        mediaCaption = viewOnceMsg.imageMessage.caption || '';
                    } else if (viewOnceMsg.videoMessage) {
                        mediaMessage = {
                            message: { videoMessage: viewOnceMsg.videoMessage },
                            key: message.key
                        };
                        isVideo = true;
                        mediaCaption = viewOnceMsg.videoMessage.caption || '';
                    } else if (viewOnceMsg.audioMessage) {
                        mediaMessage = {
                            message: { audioMessage: viewOnceMsg.audioMessage },
                            key: message.key
                        };
                        isAudio = true;
                        mediaCaption = viewOnceMsg.audioMessage.caption || '';
                    }
                }
            } else {
                if (quoted.imageMessage) {
                    mediaMessage = {
                        message: quoted,
                        key: message.key
                    };
                    isImage = true;
                    mediaCaption = quoted.imageMessage.caption || '';
                } else if (quoted.videoMessage) {
                    mediaMessage = {
                        message: quoted,
                        key: message.key
                    };
                    isVideo = true;
                    mediaCaption = quoted.videoMessage.caption || '';
                } else if (quoted.audioMessage) {
                    mediaMessage = {
                        message: quoted,
                        key: message.key
                    };
                    isAudio = true;
                    mediaCaption = quoted.audioMessage.caption || '';
                }
            }

            if (!mediaMessage) {
                await sock.sendMessage(from, {
                    text: `No media found in the quoted message. Reply to a view-once image, video, or audio.`
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
                    text: `Could not detect file type. Invalid media file.`
                }, { quoted: message });
                return;
            }

            let sendOptions = {};
            const caption = mediaCaption || 'Extracted from View Once';

            if (isImage || detectedType.mime.startsWith('image/')) {
                sendOptions = {
                    image: buffer,
                    mimetype: detectedType.mime,
                    caption: caption
                };
            } else if (isVideo || detectedType.mime.startsWith('video/')) {
                sendOptions = {
                    video: buffer,
                    mimetype: detectedType.mime,
                    caption: caption
                };
            } else if (isAudio || detectedType.mime.startsWith('audio/')) {
                sendOptions = {
                    audio: buffer,
                    mimetype: detectedType.mime,
                    ptt: false
                };
            } else {
                await sock.sendMessage(from, {
                    text: `Unsupported media type: ${detectedType.mime}`
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, sendOptions, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('VV command error:', error);
            
            await sock.sendMessage(from, {
                text: `Failed to extract media: ${error.message}`
            }, { quoted: message });
            
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};