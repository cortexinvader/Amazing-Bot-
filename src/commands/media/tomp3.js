import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

export default {
    name: 'tomp3',
    aliases: ['video2mp3', 'audioconvert'],
    category: 'media',
    description: 'Convert replied video or audio to MP3',
    usage: 'tomp3 (reply to video/audio)',
    example: 'Reply to a video and use .tomp3',
    cooldown: 10,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: true,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, from, prefix }) {
        try {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted?.videoMessage && !quoted?.audioMessage) {
                return await sock.sendMessage(from, {
                    text: `❌ Reply to a video or audio file to convert to MP3!\n\n📜 *Usage:* ${prefix}tomp3 (reply to video/audio)\n\n💡 Supports MP4, AVI, etc. for videos and audio files.`
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '🔄', key: message.key }
            });

            const processingMsg = await sock.sendMessage(from, {
                text: '🔄 Converting to MP3...'
            }, { quoted: message });

            // Download media buffer
            const mediaBuffer = await sock.downloadMediaMessage(quoted);
            const timestamp = Date.now();
            const inputPath = path.join(process.cwd(), `temp_input_${timestamp}.bin`);
            const outputPath = path.join(process.cwd(), `temp_output_${timestamp}.mp3`);

            // Write buffer to temp file
            fs.writeFileSync(inputPath, mediaBuffer);

            // Use ffmpeg to convert to MP3
            return new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .audioCodec('mp3')
                    .toFormat('mp3')
                    .on('end', async () => {
                        try {
                            // Read output file
                            const mp3Buffer = fs.readFileSync(outputPath);

                            // Cleanup temp files
                            fs.unlinkSync(inputPath);
                            fs.unlinkSync(outputPath);

                            await sock.sendMessage(from, { delete: processingMsg.key });

                            await sock.sendMessage(from, {
                                audio: mp3Buffer,
                                mimetype: 'audio/mpeg',
                                fileName: `converted_${timestamp}.mp3`,
                                ptt: false
                            }, { quoted: message });

                            await sock.sendMessage(from, {
                                react: { text: '✅', key: message.key }
                            });

                            resolve();
                        } catch (cleanupError) {
                            console.error('Cleanup error:', cleanupError);
                            reject(cleanupError);
                        }
                    })
                    .on('error', (err) => {
                        // Cleanup on error
                        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                        reject(err);
                    })
                    .save(outputPath);
            });

        } catch (error) {
            console.error('ToMP3 command error:', error);
            await sock.sendMessage(from, {
                text: `❌ Failed to convert to MP3.\n\n💡 Error: ${error.message}\nTry with a smaller file or different format.`
            }, { quoted: message });
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};