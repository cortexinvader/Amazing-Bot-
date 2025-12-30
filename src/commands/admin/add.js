export const add = {
    name: 'add',
    aliases: ['invite'],
    category: 'admin',
    description: 'Add a member to the group',
    usage: 'add 234567890',
    example: 'add 234567890',
    cooldown: 3,
    permissions: ['admin'],
    args: true,
    minArgs: 1,
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, args, from }) {
        try {
            let number = args[0].replace(/[^0-9]/g, '');
            
            if (number.startsWith('0')) {
                return await sock.sendMessage(from, {
                    text: '❌ Use international format (without +)\nExample: 234567890'
                }, { quoted: message });
            }

            const userJid = number + '@s.whatsapp.net';

            await sock.groupParticipantsUpdate(from, [userJid], 'add');

            await sock.sendMessage(from, {
                text: `✅ User added to group`,
                mentions: [userJid]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Failed to add user\n\n${error.message}\n\n💡 Make sure the number is correct`
            }, { quoted: message });
        }
    }
};