export default {
    name: 'demote',
    aliases: ['unadmin', 'removeadmin'],
    category: 'admin',
    description: 'Demote an admin to member',
    usage: 'demote @user OR reply to message',
    example: 'demote @user',
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
                    text: '❌ Mention or reply to a user to demote'
                }, { quoted: message });
            }

            const groupMetadata = await sock.groupMetadata(from);
            const normalizeJid = (jid) => jid.split('@')[0].split(':')[0];
            
            const targetNormalized = normalizeJid(targetUser);
            const participant = groupMetadata.participants.find(p => {
                return normalizeJid(p.id) === targetNormalized;
            });

            if (!participant?.admin) {
                return await sock.sendMessage(from, {
                    text: '❌ User is not an admin'
                }, { quoted: message });
            }

            if (participant.admin === 'superadmin') {
                return await sock.sendMessage(from, {
                    text: '❌ Cannot demote group owner'
                }, { quoted: message });
            }

            await sock.groupParticipantsUpdate(from, [targetUser], 'demote');

            await sock.sendMessage(from, {
                text: `✅ User demoted to member\n@${targetUser.split('@')[0]}`,
                mentions: [targetUser]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Failed to demote user\n\n${error.message}`
            }, { quoted: message });
        }
    }
};