export default {
    name: 'deepseek',
    aliases: ['deepseek3'],
    category: 'ai',
    description: 'Chat with DeepSeek AI (Currently Disabled)',
    usage: 'deepseek <prompt>',
    example: 'deepseek Explain quantum computing',
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
                text: '❌ *DeepSeek AI Temporarily Disabled*\n\nThis AI service is currently unavailable.\n\nContact the bot owner for more information.'
            }, { quoted: message });

        } catch (error) {
            console.error('DeepSeek error:', error);
            await sock.sendMessage(from, {
                text: 'Error: DeepSeek AI is currently disabled.'
            }, { quoted: message });
        }
    }
};