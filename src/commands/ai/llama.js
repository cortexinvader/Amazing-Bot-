export default {
    name: 'llama2',
    aliases: ['llama'],
    category: 'ai',
    description: 'Chat with Llama AI (Currently Disabled)',
    usage: 'llama2 <prompt>',
    example: 'llama2 What is AI?',
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
                text: '❌ *Llama AI Temporarily Disabled*\n\nThis AI service is currently unavailable.\n\nContact the bot owner for more information.'
            }, { quoted: message });

        } catch (error) {
            console.error('Llama2 error:', error);
            await sock.sendMessage(from, {
                text: 'Error: Llama AI is currently disabled.'
            }, { quoted: message });
        }
    }
};