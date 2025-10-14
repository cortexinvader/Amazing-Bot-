export default {
    name: 'hidetag',
    aliases: ['htag', 'announce'],
    category: 'admin',
    description: 'Send a message tagging everyone without showing mentions',
    usage: 'hidetag [message]',
    cooldown: 10,
    permissions: ['admin'],

    async execute({ sock, message, args, from, user, isGroup, isGroupAdmin }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: '❌ *Group Only*\n\nThis command can only be used in groups.'
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return await sock.sendMessage(from, {
                text: '❌ *Admin Only*\n\nYou need to be a group admin to use this command.'
            }, { quoted: message });
        }

        try {
            const text = args.join(' ');
            if (!text) {
                return await sock.sendMessage(from, {
                    text: '❌ *No Message*\n\nPlease provide a message to send.\n\n*Usage:* .hidetag Your announcement here'
                }, { quoted: message });
            }

            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants.map(p => p.id);

            const hiddenTagMessage = `📢 *ANNOUNCEMENT*\n\n${text}\n\n_Hidden tag notification_`;

            await sock.sendMessage(from, {
                text: hiddenTagMessage,
                mentions: participants
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to send hidden tag message.'
            }, { quoted: message });
        }
    }
};