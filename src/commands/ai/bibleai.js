export default {
    name: 'bibleai',
    aliases: ['bible', 'biblegpt'],
    category: 'ai',
    description: 'Chat with BibleGPT AI (Currently Disabled)',
    usage: 'biblegpt <prompt>',
    example: 'biblegpt What does the Bible say about love?',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: Infinity,
    typing: false,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute(options) {
        const { sock, message, from } = options;

        try {
            await sock.sendMessage(from, { react: { text: '⚠️', key: message.key } });

            await sock.sendMessage(from, {
                text: '❌ *BibleGPT AI Temporarily Disabled*\n\nThis AI service is currently unavailable.\n\nContact the bot owner for more information.'
            }, { quoted: message });

        } catch (error) {
            console.error('BibleGPT error:', error);
            await sock.sendMessage(from, {
                text: 'Error: BibleGPT AI is currently disabled.'
            }, { quoted: message });
        }
    }
};