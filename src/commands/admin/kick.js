export default {
    name: 'kick',
    aliases: ['remove'],
    category: 'admin',
    description: 'Remove a member from the group',
    usage: 'kick @user OR reply to message',
    example: 'kick @user',
    cooldown: 3,
    permissions: ['admin'],
    args: false,
    minArgs: 0,
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, from, sender }) {
        try {
            const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const replied = message.message?.extendedTextMessage?.contextInfo?.participant;
            
            let targetUser = replied || mentioned[0];
            
            if (!targetUser) {
                return await sock.sendMessage(from, {
                    text: '❌ Mention or reply to a user to kick'
                }, { quoted: message });
            }

            const botJid = sock.user?.id.split(':')[0] + '@s.whatsapp.net';
            if (targetUser === botJid) {
                return await sock.sendMessage(from, {
                    text: '❌ Cannot kick myself'
                }, { quoted: message });
            }

            const groupMetadata = await sock.groupMetadata(from);
            const normalizeJid = (jid) => jid.split('@')[0].split(':')[0];
            
            const targetNormalized = normalizeJid(targetUser);
            const participant = groupMetadata.participants.find(p => {
                return normalizeJid(p.id) === targetNormalized;
            });

            if (participant?.admin) {
                return await sock.sendMessage(from, {
                    text: '❌ Cannot kick an admin. Demote first'
                }, { quoted: message });
            }

            await sock.groupParticipantsUpdate(from, [targetUser], 'remove');

            await sock.sendMessage(from, {
                text: `✅ User removed from group\n@${targetUser.split('@')[0]}`,
                mentions: [targetUser]
            }, { quoted: message });

        } catch (error) {
            let errorMessage = '❌ Failed to kick user\n\n';
            errorMessage += error.message.includes('not-authorized') ? 'Bot lacks permission' : error.message;

            await sock.sendMessage(from, { text: errorMessage }, { quoted: message });
        }
    }
};