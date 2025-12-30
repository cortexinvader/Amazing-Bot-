export const mute = {
    name: 'mute',
    aliases: ['close', 'lockgroup'],
    category: 'admin',
    description: 'Mute group (only admins can send messages)',
    usage: 'mute',
    example: 'mute',
    cooldown: 3,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, from }) {
        try {
            await sock.groupSettingUpdate(from, 'announcement');

            await sock.sendMessage(from, {
                text: `🔒 Group muted\n\nOnly admins can send messages now`
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Failed to mute group\n\n${error.message}`
            }, { quoted: message });
        }
    }
};