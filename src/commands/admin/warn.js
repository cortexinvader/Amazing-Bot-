const userWarnings = new Map();

export default {
    name: 'warn',
    aliases: ['warning', 'warnuser'],
    category: 'admin',
    description: 'Give a warning to a user',
    usage: 'warn @user OR reply to message [reason]',
    example: 'warn @user breaking rules',
    cooldown: 5,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, args, from, sender }) {
        try {
            const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            let targetJid;
            let reason = 'No reason provided';

            if (quotedUser) {
                targetJid = quotedUser;
                reason = args.join(' ') || reason;
            } else if (mentionedUsers.length > 0) {
                targetJid = mentionedUsers[0];
                reason = args.slice(1).join(' ') || reason;
            } else {
                return await sock.sendMessage(from, {
                    text: '❌ Mention or reply to a user to warn'
                }, { quoted: message });
            }

            if (targetJid === sender) {
                return await sock.sendMessage(from, {
                    text: '❌ You cannot warn yourself'
                }, { quoted: message });
            }

            const warnings = userWarnings.get(targetJid) || [];
            
            const newWarning = {
                reason: reason,
                warnedBy: sender,
                warnedAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            };

            warnings.push(newWarning);
            userWarnings.set(targetJid, warnings);

            const warningCount = warnings.length;

            let responseText = `⚠️ User Warned\n\nUser: @${targetJid.split('@')[0]}\nReason: ${reason}\nWarned by: @${sender.split('@')[0]}\nWarning: ${warningCount}/3\nExpires: 24 hours`;

            if (warningCount >= 3) {
                responseText += `\n\n🚫 AUTO-BAN: User has received 3 warnings`;
            }

            await sock.sendMessage(from, {
                text: responseText,
                mentions: [targetJid, sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Failed to warn user\n\n${error.message}`
            }, { quoted: message });
        }
    }
};

export { userWarnings };