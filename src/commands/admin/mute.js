export default {
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

    async execute({ sock, message, from, sender }) {
        try {
            const groupMetadata = await sock.groupMetadata(from);
            
            if (groupMetadata.announce) {
                return await sock.sendMessage(from, {
                    text: '❌ Group is already muted'
                }, { quoted: message });
            }

            await sock.groupSettingUpdate(from, 'announcement');

            await sock.sendMessage(from, {
                text: '🔒 Group muted\n\nOnly admins can send messages now'
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Failed to mute group\n\n${error.message}`
            }, { quoted: message });
        }
    }
};