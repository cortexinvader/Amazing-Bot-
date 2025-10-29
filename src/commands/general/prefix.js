import config from '../../config.js';
import fs from 'fs';
import path from 'path';

export default {
    name: 'prefix',
    aliases: ['setprefix', 'changeprefix'],
    category: 'general',
    description: 'View or change the bot prefix',
    usage: 'prefix [new_prefix]',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, from, args, sender, commandHandler }) {
        const currentPrefix = config.prefix;

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
│ • (Owner only)
╰────────────────

*${config.botName} is ready!* 🚀`;

            return sock.sendMessage(from, { text: response }, { quoted: message });
        }

        if (!commandHandler.isOwner(sender)) {
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

        try {
            const envPath = path.join(process.cwd(), '.env');
            let envContent = '';
            
            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf8');
            }

            const prefixRegex = /^PREFIX=.*/m;
            if (prefixRegex.test(envContent)) {
                envContent = envContent.replace(prefixRegex, `PREFIX=${newPrefix}`);
            } else {
                envContent += `\nPREFIX=${newPrefix}`;
            }

            fs.writeFileSync(envPath, envContent, 'utf8');
            
            config.prefix = newPrefix;

            return sock.sendMessage(from, {
                text: `✅ *Prefix Updated!*\n\nNew prefix: ${newPrefix}\n\nExample: ${newPrefix}menu\n\n✨ Prefix saved to .env file!\n⚠️ Restart bot to apply changes globally.`
            }, { quoted: message });
            
        } catch (error) {
            return sock.sendMessage(from, {
                text: `❌ Failed to update prefix in .env file!\n\nError: ${error.message}`
            }, { quoted: message });
        }
    }
};