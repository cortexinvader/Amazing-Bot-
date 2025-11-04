import axios from 'axios';

const SSWEB_TIMEOUT = 15000; // 15s for screenshot
const REPLY_TIMEOUT = 300000; // 5 min for next URL

export default {
    name: 'ssweb',
    aliases: ['screenshot', 'ss'],
    category: 'utility',
    description: 'Take a screenshot of a website',
    usage: 'ssweb <url>',
    example: 'ssweb https://example.com',
    cooldown: 5,
    permissions: ['user'],
    supportsReply: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender, prefix }) {
        let url = args.join(' ').trim();

        // Handle quoted message if no args or extract URL from quoted text
        const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!url && quotedMsg) {
            url = quotedMsg.conversation ||
                  quotedMsg.extendedTextMessage?.text ||
                  quotedMsg.imageMessage?.caption ||
                  quotedMsg.videoMessage?.caption || '';
        }

        if (!url || !url.startsWith('http')) {
            return await sock.sendMessage(from, {
                text: `╭──⦿【 📸 WEBSITE SCREENSHOT 】
│
│ 💡 𝗨𝘀𝗮𝗴𝗲:
│    ${prefix}ssweb <url>
│
│ 📝 𝗘𝘅𝗮𝗺𝗽𝗹𝗲𝘀:
│    ${prefix}ssweb https://example.com
│    ${prefix}ssweb https://google.com
│
│ 🔄 𝗡𝗲𝘅𝘁 𝗦𝗵𝗼𝘁:
│    Reply to screenshot with new URL
│
╰────────────⦿`
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, {
                react: { text: '📸', key: message.key }
            });

            const statusMsg = await sock.sendMessage(from, {
                text: `⏳ Taking screenshot of ${url}...`
            }, { quoted: message });

            const apiUrl = `https://arychauhann.onrender.com/api/ssweb?url=${encodeURIComponent(url)}&type=Web`;
            const { data } = await axios.get(apiUrl, {
                timeout: SSWEB_TIMEOUT,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            const imageUrl = data.url || data.data?.url || data.image;
            if (!imageUrl) {
                throw new Error('No image URL in response');
            }

            const caption = `📸 *Screenshot of ${url}*\n\n💡 Reply with new URL for another!`;

            const sentMsg = await sock.sendMessage(from, {
                image: { url: imageUrl },
                caption
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

            if (sentMsg && sentMsg.key && sentMsg.key.id) {
                this.setupReplyListener(sock, from, sentMsg.key.id, sender, prefix);
            }

        } catch (error) {
            console.error('Ssweb command error:', error);

            const errorMsg = error.code === 'ECONNABORTED'
                ? 'Screenshot timeout - try another URL'
                : error.response?.status === 429
                ? 'Rate limit - wait a bit'
                : error.message || 'Failed to take screenshot';

            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ ERROR 】
│
│ ⚠️ Screenshot failed
│
│ 📝 Error: ${errorMsg}
│
│ 🔄 Try again
│
╰────────────⦿`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    },

    setupReplyListener(sock, from, messageId, authorizedSender, prefix) {
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
        }, REPLY_TIMEOUT);

        global.replyHandlers[messageId] = {
            command: this.name,
            authorizedSender: authorizedSender,
            timeout: replyTimeout,
            handler: async (replyText, replyMessage) => {
                const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;
                
                if (replySender !== authorizedSender) {
                    return;
                }

                let url = replyText.trim();
                if (!url || !url.startsWith('http')) {
                    await sock.sendMessage(from, {
                        text: '❌ Please provide a valid URL (starting with http).'
                    }, { quoted: replyMessage });
                    return;
                }

                try {
                    await sock.sendMessage(from, {
                        react: { text: '📸', key: replyMessage.key }
                    });

                    const statusMsg = await sock.sendMessage(from, {
                        text: `⏳ Taking screenshot of ${url}...`
                    }, { quoted: replyMessage });

                    const apiUrl = `https://arychauhann.onrender.com/api/ssweb?url=${encodeURIComponent(url)}&type=Web`;
                    const { data } = await axios.get(apiUrl, {
                        timeout: SSWEB_TIMEOUT,
                        headers: {
                            'User-Agent': 'Mozilla/5.0'
                        }
                    });

                    const imageUrl = data.url || data.data?.url || data.image;
                    if (!imageUrl) {
                        throw new Error('No image URL in response');
                    }

                    const caption = `📸 *Screenshot of ${url}*\n\n💡 Reply with new URL for another!`;

                    const newSentMsg = await sock.sendMessage(from, {
                        image: { url: imageUrl },
                        caption
                    }, { quoted: replyMessage });

                    await sock.sendMessage(from, {
                        react: { text: '✅', key: replyMessage.key }
                    });

                    clearTimeout(replyTimeout);
                    delete global.replyHandlers[messageId];

                    if (newSentMsg && newSentMsg.key && newSentMsg.key.id) {
                        this.setupReplyListener(sock, from, newSentMsg.key.id, authorizedSender, prefix);
                    }

                } catch (error) {
                    console.error('Ssweb reply error:', error);

                    const errorMsg = error.code === 'ECONNABORTED'
                        ? 'Screenshot timeout'
                        : error.response?.status === 429
                        ? 'Rate limit exceeded'
                        : error.message || 'Unknown error';

                    await sock.sendMessage(from, {
                        text: `❌ Failed to take screenshot: ${errorMsg}\nTry again!`
                    }, { quoted: replyMessage });

                    await sock.sendMessage(from, {
                        react: { text: '❌', key: replyMessage.key }
                    });

                    clearTimeout(replyTimeout);
                    delete global.replyHandlers[messageId];
                }
            }
        };
    }
};