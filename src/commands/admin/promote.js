export const promote = {
    name: 'promote',
    aliases: ['admin', 'makeadmin'],
    category: 'admin',
    description: 'Promote a member to admin',
    usage: 'promote @user',
    example: 'promote @user',
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
                    text: '❌ Please mention or reply to a user to promote'
                }, { quoted: message });
            }

            await sock.groupParticipantsUpdate(from, [targetUser], 'promote');

            await sock.sendMessage(from, {
                text: `✅ User promoted to admin`,
                mentions: [targetUser]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Failed to promote user\n\n${error.message}`
            }, { quoted: message });
        }
    }
};