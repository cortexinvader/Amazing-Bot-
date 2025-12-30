export default {
    name: 'kick',
    aliases: ['remove', 'ban'],
    category: 'admin',
    description: 'Remove a member from the group',
    usage: 'kick @user',
    example: 'kick @user',
    cooldown: 3,
    permissions: ['admin'],
    args: true,
    minArgs: 1,
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, from, sender, isGroupAdmin }) {
        try {
            const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const replied = message.message?.extendedTextMessage?.contextInfo?.participant;
            
            let targetUser = replied || mentioned[0];
            
            if (!targetUser) {
                return await sock.sendMessage(from, {
                    text: '❌ Please mention or reply to a user to kick'
                }, { quoted: message });
            }

            const groupMetadata = await sock.groupMetadata(from);
            const participant = groupMetadata.participants.find(p => {
                const pId = p.id.split('@')[0];
                const targetId = targetUser.split('@')[0];
                return pId === targetId;
            });

            if (participant?.admin) {
                return await sock.sendMessage(from, {
                    text: '❌ Cannot kick an admin'
                }, { quoted: message });
            }

            await sock.groupParticipantsUpdate(from, [targetUser], 'remove');

            await sock.sendMessage(from, {
                text: `✅ User removed from group`,
                mentions: [targetUser]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Failed to kick user\n\n${error.message}`
            }, { quoted: message });
        }
    }
};