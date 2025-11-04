import axios from 'axios';

const pinterestCache = new Map(); // Optional, but for quick, not needed
const SEARCH_TIMEOUT = 300000; // 5 min

export default {
    name: 'pinterest',
    aliases: ['pin'],
    category: 'downloader',
    description: 'Search for images on Pinterest',
    usage: 'pinterest <query>',
    example: 'pinterest wallpaper',
    cooldown: 5,
    permissions: ['user'],
    supportsReply: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender, prefix }) {
        const query = args.join(' ').trim();

        if (!query) {
            return await sock.sendMessage(from, {
                text: `╭──⦿【 🖼️ PINTEREST SEARCH 】
│
│ 💡 𝗨𝘀𝗮𝗴𝗲:
│    ${prefix}pinterest <search term>
│
│ 📝 𝗘𝘅𝗮𝗺𝗽𝗹𝗲𝘀:
│    ${prefix}pinterest wallpaper
│    ${prefix}pinterest nature
│    ${prefix}pinterest anime
│
│ 🔄 𝗥𝗲𝘀𝗲𝗮𝗿𝗰𝗵:
│    Reply to results for more
│
╰────────────⦿`
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, {
                react: { text: '🔍', key: message.key }
            });

            const statusMsg = await sock.sendMessage(from, {
                text: `⏳ Searching Pinterest for "${query}"...`
            }, { quoted: message });

            const apiUrl = `https://api.ccprojectsapis-jonell.gleeze.com/api/pin?title=${encodeURIComponent(query)}&count=10`;
            const { data } = await axios.get(apiUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            const images = data.data || [];
            if (images.length === 0) {
                await sock.sendMessage(from, {
                    text: `❌ No images found for "${query}"`,
                    edit: statusMsg.key
                }, { quoted: message });
                return;
            }

            const caption = `🖼️ *Pinterest: ${query}*\n\nFound ${images.length} images.\n💡 Reply for more results!`;

            // Send first image with caption
            const firstImage = { image: { url: images[0] }, caption };

            const sentMsg = await sock.sendMessage(from, firstImage, { quoted: message });

            // Send remaining images as album (sequential send)
            for (let i = 1; i < images.length; i++) {
                await sock.sendMessage(from, {
                    image: { url: images[i] }
                }, { 
                    quoted: sentMsg 
                });
            }

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

            if (sentMsg && sentMsg.key && sentMsg.key.id) {
                this.setupReplyListener(sock, from, sentMsg.key.id, query, sender, prefix);
            }

        } catch (error) {
            console.error('Pinterest command error:', error);

            const errorMsg = error.code === 'ECONNABORTED'
                ? 'Request timeout'
                : error.response?.status === 429
                ? 'Rate limit exceeded'
                : error.message || 'Unknown error';

            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ ERROR 】
│
│ ⚠️ Failed to fetch Pinterest images
│
│ 📝 Error: ${errorMsg}
│
│ 🔄 Try again later
│
╰────────────⦿`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    },

    setupReplyListener(sock, from, messageId, originalQuery, authorizedSender, prefix) {
        if (!global.replyHandlers) {
            global.replyHandlers = {};
        }

        const existingHandler = global.replyHandlers[messageId];
        if (existingHandler && existingHandler.timeout) {
            clearTimeout(existingHandler.timeout);
        }

        const replyTimeout = setTimeout(() => {
            if (global.replyHandlers && global.replyHandlers[messageId]) {
                delete global.replyHandlers[messageId];
            }
        }, SEARCH_TIMEOUT);

        global.replyHandlers[messageId] = {
            command: this.name,
            authorizedSender: authorizedSender,
            originalQuery: originalQuery,
            timeout: replyTimeout,
            handler: async (replyText, replyMessage) => {
                const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;
                
                if (replySender !== authorizedSender) {
                    return;
                }

                const newQuery = replyText.trim();
                const searchQuery = newQuery || originalQuery;

                // Simulate executing the command with the query
                // Here, we can call this.execute but need to mock options
                // For simplicity, reuse the logic or call execute

                // Quick way: trigger a new search with searchQuery
                try {
                    await sock.sendMessage(from, {
                        react: { text: '🔍', key: replyMessage.key }
                    });

                    const statusMsg = await sock.sendMessage(from, {
                        text: `⏳ Searching Pinterest for "${searchQuery}"...`
                    }, { quoted: replyMessage });

                    const apiUrl = `https://api.ccprojectsapis-jonell.gleeze.com/api/pin?title=${encodeURIComponent(searchQuery)}&count=10`;
                    const { data } = await axios.get(apiUrl, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0'
                        }
                    });

                    const images = data.data || [];
                    if (images.length === 0) {
                        await sock.sendMessage(from, {
                            text: `❌ No images found for "${searchQuery}"`,
                            edit: statusMsg.key
                        }, { quoted: replyMessage });
                        return;
                    }

                    const caption = `🖼️ *Pinterest: ${searchQuery}*\n\nFound ${images.length} images.\n💡 Reply for more!`;

                    const newSentMsg = await sock.sendMessage(from, {
                        image: { url: images[0] },
                        caption
                    }, { quoted: replyMessage });

                    for (let i = 1; i < images.length; i++) {
                        await sock.sendMessage(from, {
                            image: { url: images[i] }
                        }, { 
                            quoted: newSentMsg 
                        });
                    }

                    await sock.sendMessage(from, {
                        react: { text: '✅', key: replyMessage.key }
                    });

                    clearTimeout(replyTimeout);
                    delete global.replyHandlers[messageId];

                    if (newSentMsg && newSentMsg.key && newSentMsg.key.id) {
                        this.setupReplyListener(sock, from, newSentMsg.key.id, searchQuery, authorizedSender, prefix);
                    }

                } catch (error) {
                    console.error('Pinterest reply error:', error);

                    await sock.sendMessage(from, {
                        text: `❌ Failed to fetch more images. Try again!`
                    }, { quoted: replyMessage });

                    clearTimeout(replyTimeout);
                    delete global.replyHandlers[messageId];
                }
            }
        };
    }
};