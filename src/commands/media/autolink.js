import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';

const autoDownloadStates = new Map();
const downloadQueue = new Map();
const userDownloadLimits = new Map();

const supportedPlatforms = {
    youtube: /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu\.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/,
    facebook: /^(https?:\/\/)?(www\.)?(facebook|fb)\.(com|watch)\/.*$/,
    instagram: /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/(?:p|reel)\/([A-Za-z0-9\-_]+)/,
    tiktok: /^(https?:\/\/)?(www\.)?(tiktok\.com)\/.*\/video\/(\d+)/,
    twitter: /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/
};

const HOURLY_LIMIT = 25;
const GROUP_SETTINGS_FILE = 'cache/group_download_settings.json';

function loadGroupSettings() {
    try {
        if (fs.existsSync(GROUP_SETTINGS_FILE)) {
            return JSON.parse(fs.readFileSync(GROUP_SETTINGS_FILE, 'utf8'));
        }
    } catch (error) {}
    return {};
}

function saveGroupSettings(settings) {
    fs.ensureDirSync(path.dirname(GROUP_SETTINGS_FILE));
    fs.writeFileSync(GROUP_SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = userDownloadLimits.get(userId) || { count: 0, timestamp: now };

    if (now - userLimit.timestamp > 3600000) {
        userDownloadLimits.set(userId, { count: 1, timestamp: now });
        return true;
    }

    if (userLimit.count >= HOURLY_LIMIT) return false;

    userLimit.count++;
    userDownloadLimits.set(userId, userLimit);
    return true;
}

function extractValidUrls(text) {
    const urls = [];
    for (const [platform, regex] of Object.entries(supportedPlatforms)) {
        const matches = [...text.matchAll(new RegExp(regex, 'g'))];
        for (const match of matches) {
            urls.push({ url: match[0], platform });
        }
    }
    return urls;
}

async function getVideoData(url) {
    try {
        const encodedUrl = encodeURIComponent(url);
        const response = await axios.get(`https://dev-priyanshi.onrender.com/api/alldl?url=${encodedUrl}`, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.data.status || !response.data.data) {
            throw new Error('Invalid api response');
        }

        const data = response.data.data;
        const downloadUrl = data.high || data.low;
        
        if (!downloadUrl) {
            throw new Error('No download URL found');
        }

        return {
            title: data.title || 'Video',
            thumbnail: data.thumbnail,
            downloadUrl: downloadUrl,
            quality: data.high ? 'High' : 'Low'
        };
    } catch (error) {
        throw new Error(`Failed to get video data: ${error.message}`);
    }
}

async function downloadVideo(videoData, from, messageKey) {
    try {
        const timestamp = Date.now();
        const videoPath = path.join(process.cwd(), `temp_video_${from.replace(/[@.]/g, '_')}_${timestamp}.mp4`);

        const videoResponse = await axios({
            url: videoData.downloadUrl,
            method: 'GET',
            responseType: 'stream',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const writer = fs.createWriteStream(videoPath);
        videoResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(videoPath));
            writer.on('error', reject);
            
            setTimeout(() => {
                writer.destroy();
                reject(new Error('Download timeout'));
            }, 120000);
        });
    } catch (error) {
        throw new Error(`Download failed: ${error.message}`);
    }
}

export default {
    name: 'autolink',
    aliases: ['autodl'],
    category: 'media',
    description: 'Toggle auto-download for video links in chat',
    usage: 'autolink <on|off|status>',
    example: 'autolink on\nautolink status',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 0,
    maxArgs: 1,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: true, // Enable to process every message for auto-download
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, from, sender, prefix }) {
        const settings = loadGroupSettings();
        const fullText = args.join(' ').trim();
        const commandArg = args[0]?.toLowerCase();

        // If supportsChat is true and this is not a direct command invocation, process as auto-download
        if (supportsChat && !fullText.startsWith('autolink')) {
            return this.processAutoDownload({ sock, message, from, sender, text: fullText });
        }

        // Handle command: autolink on/off/status
        if (!['on', 'off', 'status'].includes(commandArg)) {
            return await sock.sendMessage(from, {
                text: `📱 Autolink Commands:\n• ${prefix}autolink on - Enable auto download\n• ${prefix}autolink off - Disable auto download\n• ${prefix}autolink status - Check current status\n\n🎥 Supported platforms: ${Object.keys(supportedPlatforms).join(', ')}`
            }, { quoted: message });
        }

        if (commandArg === 'status') {
            const status = settings[from] ? 'enabled' : 'disabled';
            const limits = userDownloadLimits.get(sender) || { count: 0 };
            const resetTime = new Date(Date.now() + 3600000).toLocaleTimeString();
            
            return await sock.sendMessage(from, {
                text: `📊 Auto Download Status:\n➤ Current state: ${status}\n➤ Your downloads: ${limits.count}/${HOURLY_LIMIT} (resets at ${resetTime})\n➤ Quality: High (when available)\n➤ Supported: ${Object.keys(supportedPlatforms).join(', ')}\n\n💡 Just send any supported video link to auto-download!`
            }, { quoted: message });
        }

        settings[from] = commandArg === 'on';
        saveGroupSettings(settings);

        const statusEmoji = commandArg === 'on' ? '✅' : '❌';
        const statusText = commandArg === 'on' ? 'enabled' : 'disabled';
        
        const replyText = `${statusEmoji} Auto download ${statusText} for this chat!\n\n` +
            (commandArg === 'on' ? 
                `🎯 Send any video link from: ${Object.keys(supportedPlatforms).join(', ')}\n⚡ Downloads will be in high quality automatically!` :
                `💤 Auto download is now disabled.`
            );

        await sock.sendMessage(from, { text: replyText }, { quoted: message });
        await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
    },

    async processAutoDownload({ sock, message, from, sender, text }) {
        const settings = loadGroupSettings();
        if (!settings[from]) return;

        const urls = extractValidUrls(text);

        if (urls.length === 0) return;

        if (!checkRateLimit(sender)) {
            const resetTime = new Date(Date.now() + 3600000).toLocaleTimeString();
            await sock.sendMessage(from, {
                text: `⚠️ Rate limit reached!\n➤ Limit: ${HOURLY_LIMIT} downloads per hour\n➤ Resets at: ${resetTime}\n\n💡 This prevents api abuse and ensures service stability.`
            }, { quoted: message });
            return;
        }

        for (const { url, platform } of urls) {
            const chatQueue = downloadQueue.get(from) || new Set();
            if (chatQueue.has(url)) continue;
            chatQueue.add(url);
            downloadQueue.set(from, chatQueue);

            try {
                await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

                const videoData = await getVideoData(url);
                const videoPath = await downloadVideo(videoData, from, message.key.id);

                const messageBody = 
                    `🎥 Auto-Downloaded Video\n➤ Platform: ${platform.charAt(0).toUpperCase() + platform.slice(1)}\n➤ Title: ${videoData.title}\n➤ Quality: ${videoData.quality}\n➤ Original: ${url}`;

                await sock.sendMessage(from, { 
                    video: { url: videoPath }, 
                    caption: messageBody 
                }, { quoted: message });

                fs.unlinkSync(videoPath);
                chatQueue.delete(url);
                await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

            } catch (error) {
                console.error(`Download error for ${url}:`, error.message);
                chatQueue.delete(url);
                await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
                
                await sock.sendMessage(from, {
                    text: `❌ Download failed for ${platform}\n➤ Error: ${error.message}\n➤ URL: ${url}\n\n💡 This might be due to: private content, expired link, or api issues.`
                }, { quoted: message });
            }
        }
    }
};