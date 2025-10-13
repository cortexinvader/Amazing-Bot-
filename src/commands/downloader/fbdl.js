import axios from 'axios';

export default {
    name: 'fbdl',
    aliases: ['facebook', 'fbvideo', 'fb', 'fbdown'],
    category: 'downloader',
    description: 'Download Facebook videos in HD quality',
    usage: 'fbdl <facebook video url>',
    example: 'fbdl https://facebook.com/watch?v=123456',
    cooldown: 30,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    maxArgs: 1,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            const url = args[0];

            const regex = /^(?:https?:\/\/)?(?:www\.|m\.|touch\.|mobile\.|l\.|lm\.|fb\.me\.)?(?:facebook\.com|fb\.me|fb\.com)\/(?:(?:.+\/)*)(?:videos\/.+|watch\/.+|reel\/.+|reels\/.+|share\/v\/.+|share\/r\/.+|story\.php\?story_fbid=\d+&id=\d+|video\.php\?v=\d+|\d+\/videos\/.+|.*\/videos\/\d+)(?:[\/?].*)?$/i;

            if (!url.match(regex)) {
                await sock.sendMessage(from, {
                    text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Invalid Facebook URL\n│\n│ 💡 𝗨𝘀𝗮𝗴𝗲:\n│ ' + prefix + 'fbdl <facebook url>\n│\n│ 📝 𝗘𝘅𝗮𝗺𝗽𝗹𝗲:\n│ ' + prefix + 'fbdl https://fb.com/video\n╰────────⦿'
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, {
                react: { text: '⏳', key: message.key }
            });

            const statusMsg = await sock.sendMessage(from, {
                text: '╭──⦿【 📥 DOWNLOADING 】\n│ 🎬 𝗧𝘆𝗽𝗲: Facebook Video\n│ ⏳ 𝗦𝘁𝗮𝘁𝘂𝘀: Processing...\n│ 📡 𝗤𝘂𝗮𝗹𝗶𝘁𝘆: HD\n╰────────⦿'
            }, { quoted: message });

            const apiUrl = `https://myapi-2f5b.onrender.com/fbvideo/search?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { timeout: 60000 });
            const data = response.data;

            if (!data || !data.hd) {
                await sock.sendMessage(from, { delete: statusMsg.key });
                await sock.sendMessage(from, {
                    text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Download failed\n│\n│ ⚠️ 𝗥𝗲𝗮𝘀𝗼𝗻: No HD link found\n│ 💡 𝗧𝗶𝗽: Try another video\n╰────────⦿'
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, { delete: statusMsg.key });

            await sock.sendMessage(from, {
                video: { url: data.hd },
                mimetype: 'video/mp4',
                caption: '╭──⦿【 ✅ DOWNLOADED 】\n│ 🎬 𝗧𝘆𝗽𝗲: Facebook Video\n│ 📦 𝗙𝗼𝗿𝗺𝗮𝘁: MP4\n│ 🎯 𝗤𝘂𝗮𝗹𝗶𝘁𝘆: HD\n│ 🔗 𝗦𝗼𝘂𝗿𝗰𝗲: Facebook\n╰────────⦿\n\n╭─────────────⦿\n│💫 | [ Ilom Bot 🍀 ]\n╰────────────⦿'
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Facebook download error:', error);
            await sock.sendMessage(from, {
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Download failed\n│\n│ ⚠️ 𝗗𝗲𝘁𝗮𝗶𝗹𝘀: ' + error.message + '\n│ 💡 𝗧𝗶𝗽: Try again later\n╰────────⦿'
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};