import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'hidetag',
    aliases: ['htag', 'announce'],
    category: 'admin',
    description: 'Send a message tagging everyone without showing mentions',
    usage: 'hidetag [message] OR reply to message',
    example: 'hidetag Important announcement for all members',
    cooldown: 10,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, args, from, sender, isGroup, isGroupAdmin }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: formatResponse.error('GROUP ONLY',
                    'This command can only be used in groups')
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return await sock.sendMessage(from, {
                text: formatResponse.error('ADMIN ONLY',
                    'You need to be a group admin to use this command')
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
                    text: formatResponse.error('NO MESSAGE',
                        'Please provide a message to send',
                        'Usage: hidetag Your announcement here OR reply to message')
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
                text: formatResponse.error('HIDETAG FAILED',
                    'Failed to send hidden tag message',
                    error.message)
            }, { quoted: message });
        }
    }
};
