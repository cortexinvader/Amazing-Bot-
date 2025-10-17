import config from '../../config.js';
import { getGroup, updateGroup } from '../../models/Group.js';
import Settings from '../../models/Settings.js';

export default {
    name: 'prefix',
    aliases: ['setprefix', 'changeprefix'],
    category: 'general',
    description: 'View or change the bot prefix',
    usage: 'prefix [new_prefix]',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, from, args, isGroup, isGroupAdmin, sender, commandHandler }) {
        const currentPrefix = isGroup ? 
            (await getGroup(from))?.settings?.prefix || config.groupPrefix : 
            config.prefix;

        if (!args[0]) {
            const response = `╭─「 *BOT PREFIX* 」
│ 🎯 *Current Prefix:* ${currentPrefix}
│ 
│ 💡 *How to use:*
│ • Type ${currentPrefix}[command] 
│ • Example: ${currentPrefix}help
│ • Example: ${currentPrefix}menu
│ 
│ ⚙️ *Change Prefix:*
│ • ${currentPrefix}prefix [new_prefix]
│ • Example: ${currentPrefix}prefix !
│ • (Admin only in groups)
╰────────────────

*${config.botName} is ready!* 🚀`;

            return sock.sendMessage(from, { text: response }, { quoted: message });
        }

        if (isGroup && !isGroupAdmin && !commandHandler.isOwner(sender)) {
            return sock.sendMessage(from, {
                text: `❌ Only group admins can change the prefix!`
            }, { quoted: message });
        }

        if (!isGroup && !commandHandler.isOwner(sender)) {
            return sock.sendMessage(from, {
                text: `❌ Only the owner can change the prefix!`
            }, { quoted: message });
        }

        const newPrefix = args[0];

        if (newPrefix.length > 3) {
            return sock.sendMessage(from, {
                text: `❌ Prefix must be 1-3 characters long!`
            }, { quoted: message });
        }

        if (isGroup) {
            await updateGroup(from, {
                'settings.prefix': newPrefix
            });
        } else {
            config.prefix = newPrefix;
            
            await Settings.findOneAndUpdate(
                { key: 'prefix' },
                { 
                    key: 'prefix',
                    value: newPrefix,
                    type: 'string',
                    description: 'Bot command prefix',
                    category: 'general',
                    editable: true
                },
                { upsert: true, new: true }
            ).catch(() => {});
        }

        return sock.sendMessage(from, {
            text: `✅ *Prefix Updated!*\n\nNew prefix: ${newPrefix}\n\nExample: ${newPrefix}menu${!isGroup ? '\n✨ Global prefix saved to database!' : ''}`
        }, { quoted: message });
    }
};