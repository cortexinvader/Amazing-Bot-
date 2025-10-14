import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'tagall',
    aliases: ['mentionall', 'everyone'],
    category: 'admin',
    description: 'Tag all group members with a message',
    usage: 'tagall [message] OR reply to message',
    cooldown: 15,
    permissions: ['admin'],

    async execute({ sock, message, args, from, isGroup, isGroupAdmin }) {
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
            let text = args.join(' ') || 'Group Notification';
            
            if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quotedText = message.message.extendedTextMessage.contextInfo.quotedMessage.conversation || 
                                  message.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text || '';
                if (quotedText) {
                    text = quotedText;
                }
            }
            
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants.map(p => p.id);

            let tagMessage = `╭──⦿【 📢 GROUP ANNOUNCEMENT 】
│
│ ${text}
│
│ 👥 𝗧𝗮𝗴𝗴𝗲𝗱 𝗠𝗲𝗺𝗯𝗲𝗿𝘀:
│`;
            
            participants.forEach((participant, index) => {
                const number = participant.split('@')[0];
                tagMessage += `\n│ ${index + 1}. @${number}`;
            });

            tagMessage += `\n│
│ 📊 𝗧𝗼𝘁𝗮𝗹 𝗠𝗲𝗺𝗯𝗲𝗿𝘀: ${participants.length}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│ ⏰ 𝗧𝗶𝗺𝗲: ${new Date().toLocaleTimeString()}
│
╰────────────⦿`;

            await sock.sendMessage(from, {
                text: tagMessage,
                mentions: participants
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('TAGALL FAILED',
                    'Failed to tag all members',
                    'Try again or contact admin')
            }, { quoted: message });
        }
    }
};
