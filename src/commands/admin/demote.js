
export const demote = {
    name: 'demote',
    aliases: ['unadmin', 'removeadmin'],
    category: 'admin',
    description: 'Demote an admin to member',
    usage: 'demote @user',
    example: 'demote @user',
    cooldown: 3,
    permissions: ['admin'],
    args: true,
    minArgs: 1,
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, from }) {
        try {
            const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const replied = message.message?.extendedTextMessage?.contextInfo?.participant;
            
            let targetUser = replied || mentioned[0];
            
            if (!targetUser) {
                return await sock.sendMessage(from, {
                    text: '❌ Please mention or reply to a user to demote'
                }, { quoted: message });
            }

            await sock.groupParticipantsUpdate(from, [targetUser], 'demote');

            await sock.sendMessage(from, {
                text: `✅ User demoted to member`,
                mentions: [targetUser]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Failed to demote user\n\n${error.message}`
            }, { quoted: message });
        }
    }
};
