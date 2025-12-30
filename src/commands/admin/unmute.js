export const unmute = {
    name: 'unmute',
    aliases: ['open', 'unlockgroup'],
    category: 'admin',
    description: 'Unmute group (all members can send messages)',
    usage: 'unmute',
    example: 'unmute',
    cooldown: 3,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, from }) {
        try {
            await sock.groupSettingUpdate(from, 'not_announcement');

            await sock.sendMessage(from, {
                text: `🔓 Group unmuted\n\nAll members can send messages now`
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Failed to unmute group\n\n${error.message}`
            }, { quoted: message });
        }
    }
};