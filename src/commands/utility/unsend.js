export default {
    name: 'unsend',
    aliases: ['delete', 'del', 'remove'],
    category: 'utility',
    description: 'Delete bot messages by replying to them',
    usage: 'unsend (reply to bot message)',
    example: 'Reply to any bot message and type: unsend',
    cooldown: 2,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: false,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: false,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedKey = message.message?.extendedTextMessage?.contextInfo?.stanzaId;
            const quotedParticipant = message.message?.extendedTextMessage?.contextInfo?.participant;

            if (!quotedMsg || !quotedKey) {
                await sock.sendMessage(from, {
                    text: 'Reply to a bot message to delete it'
                }, { quoted: message });
                return;
            }

            const botNumber = sock.user.id.split(':')[0];
            const quotedSender = quotedParticipant ? quotedParticipant.split('@')[0] : null;

            if (quotedSender !== botNumber) {
                await sock.sendMessage(from, {
                    text: 'I can only delete my own messages'
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, {
                delete: {
                    remoteJid: from,
                    fromMe: true,
                    id: quotedKey,
                    participant: quotedParticipant
                }
            });

            const confirmMsg = await sock.sendMessage(from, {
                text: '✅ Message deleted'
            }, { quoted: message });

            setTimeout(async () => {
                try {
                    await sock.sendMessage(from, {
                        delete: confirmMsg.key
                    });
                } catch (err) {
                    console.error('Failed to delete confirmation:', err);
                }
            }, 3000);

        } catch (error) {
            console.error('Unsend command error:', error);
            await sock.sendMessage(from, {
                text: 'Failed to delete message'
            }, { quoted: message });
        }
    }
};