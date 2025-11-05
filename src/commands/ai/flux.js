import axios from 'axios';

const FLUX_TIMEOUT = 30000; // 30s for generation
const REPLY_TIMEOUT = 300000; // 5 min for next prompt

export default {
    name: 'flux',
    aliases: ['fluxpro', 'generate', 'img'],
    category: 'ai',
    description: 'Generate images using Flux AI',
    usage: 'flux <prompt>',
    example: 'flux cat in space',
    cooldown: 10,
    permissions: ['user'],
    supportsReply: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender, prefix }) {
        let prompt = args.join(' ').trim();

        // Handle quoted message if no args
        const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!prompt && quotedMsg) {
            prompt = quotedMsg.conversation ||
                     quotedMsg.extendedTextMessage?.text ||
                     quotedMsg.imageMessage?.caption ||
                     quotedMsg.videoMessage?.caption || '';
        }

        if (!prompt) {
            return await sock.sendMessage(from, {
                text: `╭──⦿【 🎨 FLUX AI GENERATOR 】
│
│ 💡 𝗨𝘀𝗮𝗴𝗲:
│    ${prefix}flux <your prompt>
│
│ 📝 𝗘𝘅𝗮𝗺𝗽𝗹𝗲𝘀:
│    ${prefix}flux cat in space
│    ${prefix}flux futuristic city
│    ${prefix}flux abstract art
│
│ 🔄 𝗡𝗲𝘅𝘁 𝗜𝗺𝗮𝗴𝗲:
│    Reply to generated image with new prompt
│
╰────────────⦿`
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, {
                react: { text: '🎨', key: message.key }
            });

            const statusMsg = await sock.sendMessage(from, {
                text: `⏳ Generating image for "${prompt}"...`
            }, { quoted: message });

            const apiUrl = `https://arychauhann.onrender.com/api/fluxpro?prompt=${encodeURIComponent(prompt)}`;
            const { data } = await axios.get(apiUrl, {
                timeout: FLUX_TIMEOUT,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            // Assume response has { url: 'image_url' } or { data: { url: '...' } }; adjust if needed
            const imageUrl = data.url || data.data?.url || data.image;
            if (!imageUrl) {
                throw new Error('No image URL in response');
            }

            const caption = `🎨 *Flux AI Generated*\n\nPrompt: "${prompt}"\n💡 Reply with new prompt for another!`;

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
            console.error('Flux command error:', error);

            const errorMsg = error.code === 'ECONNABORTED'
                ? 'Generation timeout - try shorter prompt'
                : error.response?.status === 429
                ? 'Rate limit - wait a bit'
                : error.message || 'Failed to generate image';

            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ ERROR 】
│
│ ⚠️ Image generation failed
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

                const prompt = replyText.trim();
                if (!prompt) {
                    await sock.sendMessage(from, {
                        text: '❌ Please provide a prompt for the next image.'
                    }, { quoted: replyMessage });
                    return;
                }

                try {
                    await sock.sendMessage(from, {
                        react: { text: '🎨', key: replyMessage.key }
                    });

                    const statusMsg = await sock.sendMessage(from, {
                        text: `⏳ Generating image for "${prompt}"...`
                    }, { quoted: replyMessage });

                    const apiUrl = `https://arychauhann.onrender.com/api/fluxpro?prompt=${encodeURIComponent(prompt)}`;
                    const { data } = await axios.get(apiUrl, {
                        timeout: FLUX_TIMEOUT,
                        headers: {
                            'User-Agent': 'Mozilla/5.0'
                        }
                    });

                    const imageUrl = data.url || data.data?.url || data.image;
                    if (!imageUrl) {
                        throw new Error('No image URL in response');
                    }

                    const caption = `🎨 *Flux AI Generated*\n\nPrompt: "${prompt}"\n💡 Reply with new prompt for another!`;

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
                    console.error('Flux reply error:', error);

                    const errorMsg = error.code === 'ECONNABORTED'
                        ? 'Generation timeout'
                        : error.response?.status === 429
                        ? 'Rate limit exceeded'
                        : error.message || 'Unknown error';

                    await sock.sendMessage(from, {
                        text: `❌ Failed to generate: ${errorMsg}\nTry again!`
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