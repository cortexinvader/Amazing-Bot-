export default {
    name: 'hidetag',
    aliases: ['htag', 'announce'],
    category: 'admin',
    description: 'Send a message tagging everyone without showing mentions',
    usage: 'hidetag [message] OR reply to message',
    example: 'hidetag Important announcement',
    cooldown: 10,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, args, from, sender, isGroup, isGroupAdmin }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Group only command\n│\n│ 💡 This command works in groups\n╰────────⦿'
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return await sock.sendMessage(from, {
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Admin only\n│\n│ 💡 You need admin privileges\n╰────────⦿'
            }, { quoted: message });
        }

        try {
            let text = args.join(' ');
            
            if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quotedText = message.message.extendedTextMessage.contextInfo.quotedMessage.conversation || 
                                  message.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text || '';
                if (quotedText) {
                    text = quotedText;
                }
            }

            if (!text) {
                return await sock.sendMessage(from, {
                    text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: No message provided\n│\n│ 💡 Provide text or reply\n╰────────⦿'
                }, { quoted: message });
            }

            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants.map(p => p.id);

            const hiddenTagMessage = `╭──⦿【 📢 ANNOUNCEMENT 】
│
│ ${text}
│
│ 📣 Hidden tag notification
│ 📅 ${new Date().toLocaleDateString()}
│ ⏰ ${new Date().toLocaleTimeString()}
│
╰────────────⦿`;

            await sock.sendMessage(from, {
                text: hiddenTagMessage,
                mentions: participants
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Hidetag failed\n│\n│ 💡 Try again later\n╰────────⦿'
            }, { quoted: message });
        }
    }
};