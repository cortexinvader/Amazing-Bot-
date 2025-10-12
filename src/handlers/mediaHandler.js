import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MediaHandler {
    constructor() {
        this.tempDir = path.join(process.cwd(), 'temp');
        this.mediaDir = path.join(process.cwd(), 'media');
        this.maxFileSize = 100 * 1024 * 1024;
        this.supportedImageFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        this.supportedVideoFormats = ['.mp4', '.mkv', '.avi', '.mov', '.webm'];
        this.supportedAudioFormats = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
    }

    async processMedia(sock, message, media, user) {
        try {
            if (!media) return null;

            const mediaType = this.getMediaType(media.mimetype);
            logger.info(`Processing ${mediaType} media from ${user.name}`);

            if (media.size > this.maxFileSize) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ File too large! Maximum size is ${this.maxFileSize / (1024 * 1024)}MB`
                });
                return null;
            }

            switch (mediaType) {
                case 'image':
                    return await this.processImage(sock, message, media);
                case 'video':
                    return await this.processVideo(sock, message, media);
                case 'audio':
                    return await this.processAudio(sock, message, media);
                case 'document':
                    return await this.processDocument(sock, message, media);
                default:
                    logger.warn(`Unsupported media type: ${mediaType}`);
                    return null;
            }
        } catch (error) {
            logger.error('Error processing media:', error);
            return null;
        }
    }

    async processQuotedMedia(sock, message, mediaData, user) {
        try {
            if (!mediaData) return null;

            logger.info(`Processing quoted media from ${user.name}`);
            
            const mediaType = this.getMediaType(mediaData.mimetype);
            const processedMedia = {
                type: mediaType,
                path: mediaData.filePath,
                buffer: mediaData.buffer,
                size: mediaData.size,
                mimetype: mediaData.mimetype
            };

            return processedMedia;
        } catch (error) {
            logger.error('Error processing quoted media:', error);
            return null;
        }
    }

    async processImage(sock, message, media) {
        try {
            const buffer = media.buffer;
            const metadata = await sharp(buffer).metadata();
            
            const processedImage = {
                type: 'image',
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                size: buffer.length,
                path: media.filePath,
                buffer: buffer
            };

            logger.info(`Image processed: ${metadata.width}x${metadata.height} ${metadata.format}`);
            return processedImage;
        } catch (error) {
            logger.error('Error processing image:', error);
            return null;
        }
    }

    async processVideo(sock, message, media) {
        try {
            const videoPath = media.filePath;
            
            return new Promise((resolve, reject) => {
                ffmpeg.ffprobe(videoPath, (err, metadata) => {
                    if (err) {
                        logger.error('Error probing video:', err);
                        resolve(null);
                        return;
                    }

                    const videoStream = metadata.streams.find(s => s.codec_type === 'video');
                    const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

                    const processedVideo = {
                        type: 'video',
                        duration: metadata.format.duration,
                        width: videoStream?.width,
                        height: videoStream?.height,
                        codec: videoStream?.codec_name,
                        hasAudio: !!audioStream,
                        size: metadata.format.size,
                        path: videoPath,
                        bitrate: metadata.format.bit_rate
                    };

                    logger.info(`Video processed: ${processedVideo.width}x${processedVideo.height} ${processedVideo.duration}s`);
                    resolve(processedVideo);
                });
            });
        } catch (error) {
            logger.error('Error processing video:', error);
            return null;
        }
    }

    async processAudio(sock, message, media) {
        try {
            const audioPath = media.filePath;
            
            return new Promise((resolve, reject) => {
                ffmpeg.ffprobe(audioPath, (err, metadata) => {
                    if (err) {
                        logger.error('Error probing audio:', err);
                        resolve(null);
                        return;
                    }

                    const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

                    const processedAudio = {
                        type: 'audio',
                        duration: metadata.format.duration,
                        codec: audioStream?.codec_name,
                        bitrate: audioStream?.bit_rate,
                        sampleRate: audioStream?.sample_rate,
                        channels: audioStream?.channels,
                        size: metadata.format.size,
                        path: audioPath
                    };

                    logger.info(`Audio processed: ${processedAudio.duration}s ${processedAudio.codec}`);
                    resolve(processedAudio);
                });
            });
        } catch (error) {
            logger.error('Error processing audio:', error);
            return null;
        }
    }

    async processDocument(sock, message, media) {
        try {
            const processedDocument = {
                type: 'document',
                fileName: media.fileName,
                mimetype: media.mimetype,
                size: media.size,
                path: media.filePath,
                buffer: media.buffer
            };

            logger.info(`Document processed: ${processedDocument.fileName} (${processedDocument.size} bytes)`);
            return processedDocument;
        } catch (error) {
            logger.error('Error processing document:', error);
            return null;
        }
    }

    getMediaType(mimetype) {
        if (!mimetype) return 'unknown';
        
        if (mimetype.startsWith('image/')) return 'image';
        if (mimetype.startsWith('video/')) return 'video';
        if (mimetype.startsWith('audio/')) return 'audio';
        if (mimetype.startsWith('application/')) return 'document';
        
        return 'unknown';
    }

    async convertImage(inputPath, outputFormat = 'png') {
        try {
            const outputPath = inputPath.replace(path.extname(inputPath), `.${outputFormat}`);
            await sharp(inputPath)
                .toFormat(outputFormat)
                .toFile(outputPath);
            
            logger.info(`Image converted to ${outputFormat}: ${outputPath}`);
            return outputPath;
        } catch (error) {
            logger.error('Error converting image:', error);
            return null;
        }
    }

    async resizeImage(inputPath, width, height) {
        try {
            const outputPath = inputPath.replace(path.extname(inputPath), '_resized' + path.extname(inputPath));
            await sharp(inputPath)
                .resize(width, height, { fit: 'cover' })
                .toFile(outputPath);
            
            logger.info(`Image resized to ${width}x${height}: ${outputPath}`);
            return outputPath;
        } catch (error) {
            logger.error('Error resizing image:', error);
            return null;
        }
    }

    async compressImage(inputPath, quality = 80) {
        try {
            const ext = path.extname(inputPath).toLowerCase();
            const outputPath = inputPath.replace(ext, '_compressed' + ext);
            
            const image = sharp(inputPath);
            
            if (ext === '.jpg' || ext === '.jpeg') {
                await image.jpeg({ quality }).toFile(outputPath);
            } else if (ext === '.png') {
                await image.png({ quality }).toFile(outputPath);
            } else if (ext === '.webp') {
                await image.webp({ quality }).toFile(outputPath);
            } else {
                await image.toFile(outputPath);
            }
            
            logger.info(`Image compressed: ${outputPath}`);
            return outputPath;
        } catch (error) {
            logger.error('Error compressing image:', error);
            return null;
        }
    }

    async extractAudioFromVideo(videoPath) {
        try {
            const audioPath = videoPath.replace(path.extname(videoPath), '.mp3');
            
            return new Promise((resolve, reject) => {
                ffmpeg(videoPath)
                    .output(audioPath)
                    .audioCodec('libmp3lame')
                    .audioBitrate('192k')
                    .on('end', () => {
                        logger.info(`Audio extracted: ${audioPath}`);
                        resolve(audioPath);
                    })
                    .on('error', (err) => {
                        logger.error('Error extracting audio:', err);
                        reject(err);
                    })
                    .run();
            });
        } catch (error) {
            logger.error('Error extracting audio from video:', error);
            return null;
        }
    }

    async cleanupTempFiles(maxAge = 3600000) {
        try {
            const tempDirs = [
                path.join(this.tempDir, 'image'),
                path.join(this.tempDir, 'video'),
                path.join(this.tempDir, 'audio'),
                path.join(this.tempDir, 'document')
            ];

            let deletedCount = 0;
            const now = Date.now();

            for (const dir of tempDirs) {
                if (await fs.pathExists(dir)) {
                    const files = await fs.readdir(dir);
                    
                    for (const file of files) {
                        const filePath = path.join(dir, file);
                        const stats = await fs.stat(filePath);
                        
                        if (now - stats.mtimeMs > maxAge) {
                            await fs.remove(filePath);
                            deletedCount++;
                        }
                    }
                }
            }

            logger.info(`Cleaned up ${deletedCount} temporary media files`);
            return deletedCount;
        } catch (error) {
            logger.error('Error cleaning temp files:', error);
            return 0;
        }
    }
}

const mediaHandler = new MediaHandler();

export default mediaHandler;
