export default {
    name: 'delete',
    aliases: ['del', 'remove'],
    category: 'admin',
    description: 'Delete a message by replying to it',
    usage: 'delete (reply to message)',
    cooldown: 3,
    permissions: ['admin'],

    async execute({ sock, message, args, from, user, isGroup, isGroupAdmin, isBotAdmin }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: '❌ *Group Only*\n\nThis command can only be used in groups.'
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return await sock.sendMessage(from, {
                text: '❌ *Admin Only*\n\nYou need to be a group admin to use this command.'
            }, { quoted: message });
        }

        if (!isBotAdmin) {
            return await sock.sendMessage(from, {
                text: '❌ *Bot Not Admin*\n\nI need to be an admin to delete messages.'
            }, { quoted: message });
        }

        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMessage) {
            return await sock.sendMessage(from, {
                text: '❌ *No Message*\n\nReply to the message you want to delete.'
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

            await sock.sendMessage(from, {
                text: '✅ *Message Deleted*\n\nThe selected message has been deleted.'
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to delete the message. Make sure I have admin permissions.'
            }, { quoted: message });
        }
    }
};