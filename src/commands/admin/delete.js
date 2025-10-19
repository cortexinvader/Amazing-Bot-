import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'delete',
    aliases: ['del', 'remove'],
    category: 'admin',
    description: 'Delete a message by replying to it',
    usage: 'delete (reply to message)',
    example: 'Reply to message and type: delete',
    cooldown: 3,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, args, from, sender, isGroup, isGroupAdmin, isBotAdmin }) {
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

        if (!isBotAdmin) {
            return await sock.sendMessage(from, {
                text: formatResponse.error('BOT NOT ADMIN',
                    'I need admin privileges to delete messages',
                    'Make me an admin first')
            }, { quoted: message });
        }

        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMessage) {
            return await sock.sendMessage(from, {
                text: formatResponse.error('NO MESSAGE',
                    'Reply to the message you want to delete',
                    'Usage: Reply to message and type: delete')
            }, { quoted: message });
        }

        try {
            const quotedMessageId = message.message.extendedTextMessage.contextInfo.stanzaId;
            const quotedParticipant = message.message.extendedTextMessage.contextInfo.participant;

            await sock.sendMessage(from, {
                delete: {
                    remoteJid: from,
                    fromMe: false,
                    id: quotedMessageId,
                    participant: quotedParticipant
                }
            });

            const confirmMsg = await sock.sendMessage(from, {
                text: `╭──⦿【 ✅ MESSAGE DELETED 】
│
│ 🗑️ 𝗔𝗰𝘁𝗶𝗼𝗻: Message removed
│ 👮 𝗗𝗲𝗹𝗲𝘁𝗲𝗱 𝗯𝘆: @${sender.split('@')[0]}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
╰────────────⦿`,
                mentions: [sender]
            }, { quoted: message });

            setTimeout(async () => {
                try {
                    await sock.sendMessage(from, {
                        delete: {
                            remoteJid: from,
                            fromMe: true,
                            id: confirmMsg.key.id
                        }
                    });
                } catch (e) {}
            }, 3000);

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('DELETE FAILED',
                    'Failed to delete the message',
                    'Make sure I have admin permissions and the message is not too old')
            }, { quoted: message });
        }
    }
};
