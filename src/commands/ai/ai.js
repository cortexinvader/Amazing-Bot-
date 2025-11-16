export default {
    name: 'ai',
    aliases: ['chat', 'gpt', 'openai', 'ask'],
    category: 'ai',
    description: 'Chat with AI (Currently Disabled)',
    usage: 'ai <query>',
    example: 'ai What is quantum physics?',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
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
            await sock.sendMessage(from, {
                react: { text: '⚠️', key: message.key }
            });

            await sock.sendMessage(from, {
                text: `❌ *AI Service Temporarily Disabled*\n\nThe AI chat feature is currently unavailable as no API key is configured.\n\nTo enable this feature:\n• Contact the bot owner\n• Configure OpenAI or Gemini API\n\nThank you for your understanding!`
            }, { quoted: message });

        } catch (error) {
            console.error('AI command error:', error);
            await sock.sendMessage(from, {
                text: '❌ AI service is currently disabled.'
            }, { quoted: message });
        }
    }
};
