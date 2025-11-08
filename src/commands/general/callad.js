export default {
    name: 'callad',
    aliases: ['reportowner', 'contactowner', 'ownerreport'],
    category: 'general',
    description: 'Send a message directly to the bot owner',
    usage: 'callad <your message> OR reply to a message with callad',
    example: 'callad I need help with the bot\nReply to a message: callad',
    cooldown: 60,
    permissions: [],

    async execute({ sock, message, args, from, sender, isGroup }) {
        try {
            const config = (await import('../../config.js')).default;
            
            if (!config.ownerNumbers || config.ownerNumbers.length === 0) {
                return await sock.sendMessage(from, {
                    text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Owner contact not configured\n│\n│ 💡 Bot owner needs to set OWNER_NUMBERS\n╰────────⦿'
                }, { quoted: message });
            }
            
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const messageText = args.join(' ');
            
            if (!quotedMessage && !messageText) {
                return await sock.sendMessage(from, {
                    text: '╭──⦿【 ℹ️ USAGE 】\n│ 𝗖𝗼𝗺𝗺𝗮𝗻𝗱: callad\n│\n│ 📝 Usage:\n│    • callad <message>\n│    • Reply to message: callad\n│\n│ 📌 Example:\n│    callad I need help with bot\n│\n╰────────⦿'
                }, { quoted: message });
            }
            
            await sock.sendMessage(from, {
                react: { text: '📨', key: message.key }
            });
            
            const senderNumber = sender.split('@')[0];
            const senderName = message.pushName || senderNumber;
            const timestamp = new Date().toLocaleString();
            const chatType = isGroup ? 'Group' : 'Private Chat';
            
            let groupInfo = '';
            if (isGroup) {
                try {
                    const groupMetadata = await sock.groupMetadata(from);
                    groupInfo = `\n│ 👥 𝗚𝗿𝗼𝘂𝗽: ${groupMetadata.subject}\n│ 🔗 𝗚𝗿𝗼𝘂𝗽 𝗜𝗗: ${from}`;
                } catch (error) {
                    groupInfo = `\n│ 🔗 𝗚𝗿𝗼𝘂𝗽 𝗜𝗗: ${from}`;
                }
            }
            
            let ownerMessage = `╭━━━━⦿【 📩 NEW MESSAGE FROM USER 】⦿━━━━╮
│
│ 👤 𝗙𝗿𝗼𝗺: ${senderName}
│ 📱 𝗡𝘂𝗺𝗯𝗲𝗿: @${senderNumber}
│ 💬 𝗖𝗵𝗮𝘁 𝗧𝘆𝗽𝗲: ${chatType}${groupInfo}
│ 🕐 𝗧𝗶𝗺𝗲: ${timestamp}
│
│ ━━━━━━━━━━━━━━━━━━━━━━━━
│
│ 💬 𝗠𝗲𝘀𝘀𝗮𝗴𝗲:
│ "${messageText || 'See quoted message below'}"
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

💡 Reply to this message to respond to the user`;
            
            const ownerJid = config.ownerNumbers[0];
            
            if (quotedMessage) {
                const quotedText = quotedMessage.conversation || 
                                 quotedMessage.extendedTextMessage?.text || 
                                 quotedMessage.imageMessage?.caption || 
                                 quotedMessage.videoMessage?.caption || 
                                 'Media message';
                
                ownerMessage += `\n\n📎 Quoted message: "${quotedText}"`;
                
                if (quotedMessage.imageMessage) {
                    const imageBuffer = await sock.downloadMediaMessage({
                        message: { imageMessage: quotedMessage.imageMessage }
                    });
                    
                    await sock.sendMessage(ownerJid, {
                        image: imageBuffer,
                        caption: ownerMessage,
                        mentions: [sender]
                    });
                } else if (quotedMessage.videoMessage) {
                    const videoBuffer = await sock.downloadMediaMessage({
                        message: { videoMessage: quotedMessage.videoMessage }
                    });
                    
                    await sock.sendMessage(ownerJid, {
                        video: videoBuffer,
                        caption: ownerMessage,
                        mentions: [sender]
                    });
                } else {
                    await sock.sendMessage(ownerJid, {
                        text: ownerMessage,
                        mentions: [sender]
                    });
                }
            } else {
                await sock.sendMessage(ownerJid, {
                    text: ownerMessage,
                    mentions: [sender]
                });
            }
            
            const successMessage = `╭──⦿【 ✅ MESSAGE SENT 】\n│\n│ 📨 Your message has been sent to the bot owner\n│ ⏰ Sent at: ${timestamp}\n│\n│ 💡 The owner will respond when available\n│ 🙏 Thank you for contacting us!\n│\n╰────────────⦿`;
            
            await sock.sendMessage(from, {
                text: successMessage
            }, { quoted: message });
            
            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });
            
            const logger = (await import('../../utils/logger.js')).default;
            logger.info(`Message sent to owner from ${senderName} (${senderNumber})`);
            
        } catch (error) {
            const logger = (await import('../../utils/logger.js')).default;
            logger.error('Error in callad command:', error);
            
            await sock.sendMessage(from, {
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Failed to send message\n│\n│ 💡 Please try again later\n╰────────⦿'
            }, { quoted: message });
            
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};
