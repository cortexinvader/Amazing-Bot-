import config from '../../config.js';
import { updateGroup } from '../../models/Group.js';
import Settings from '../../models/Settings.js';

export default {
    name: 'prefix',
    aliases: ['setprefix', 'changeprefix'],
    category: 'general',
    description: 'View or change bot prefix',
    usage: 'prefix [new_prefix]',
    example: 'prefix\nprefix !\nprefix /',
    cooldown: 5,
    permissions: ['owner'],
    args: false,
    minArgs: 0,
    maxArgs: 1,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: true,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, from, sender, isGroup }) {
        try {
            await sock.sendMessage(from, {
                react: { text: '🎯', key: message.key }
            });

            const currentPrefix = config.prefix;

            if (!args[0]) {
                return await sock.sendMessage(from, {
                    text: `╭──⦿【 🎯 CURRENT PREFIX 】
│
│ 📝 𝗖𝘂𝗿𝗿𝗲𝗻𝘁: ${currentPrefix}
│ 👤 𝗢𝘄𝗻𝗲𝗿 𝗡𝗼 𝗣𝗿𝗲𝗳𝗶𝘅: ${config.ownerNoPrefix ? 'ON' : 'OFF'}
│ 📊 𝗠𝗼𝗱𝗲: ${config.publicMode ? 'Public' : 'Private'}
│
│ 💡 𝗖𝗵𝗮𝗻𝗴𝗲 𝗣𝗿𝗲𝗳𝗶𝘅:
│    ${currentPrefix}prefix <new_prefix>
│
│ 📝 𝗘𝘅𝗮𝗺𝗽𝗹𝗲𝘀:
│    ${currentPrefix}prefix !
│    ${currentPrefix}prefix /
│    ${currentPrefix}prefix #
│
╰────────────⦿

💫 | [ ${config.botName || 'Ilom Bot'} 🍀 ]`
                }, { quoted: message });
            }

            const newPrefix = args[0];

            if (newPrefix.length > 5) {
                return await sock.sendMessage(from, {
                    text: `╭──⦿【 ❌ ERROR 】
│
│ ⚠️ Prefix too long
│
│ 📏 𝗠𝗮𝘅 𝗟𝗲𝗻𝗴𝘁𝗵: 5 characters
│ 📊 𝗬𝗼𝘂𝗿 𝗟𝗲𝗻𝗴𝘁𝗵: ${newPrefix.length}
│
│ 💡 Try shorter prefix
│
╰────────────⦿`
                }, { quoted: message });
            }

            if (/\s/.test(newPrefix)) {
                return await sock.sendMessage(from, {
                    text: `╭──⦿【 ❌ ERROR 】
│
│ ⚠️ Invalid prefix
│
│ 🚫 𝗖𝗮𝗻𝗻𝗼𝘁 𝗖𝗼𝗻𝘁𝗮𝗶𝗻:
│    • Spaces
│    • Tabs
│    • Newlines
│
│ ✅ 𝗩𝗮𝗹𝗶𝗱 𝗘𝘅𝗮𝗺𝗽𝗹𝗲𝘀:
│    . ! / # $ % & *
│
╰────────────⦿`
                }, { quoted: message });
            }

            const oldPrefix = config.prefix;
            config.prefix = newPrefix;

            try {
                await Settings.findOneAndUpdate(
                    { key: 'prefix' },
                    { key: 'prefix', value: newPrefix },
                    { upsert: true, new: true }
                );
            } catch (dbError) {
                console.error('Failed to save prefix to database:', dbError);
            }

            await sock.sendMessage(from, {
                text: `╭──⦿【 ✅ PREFIX UPDATED 】
│
│ 🔄 𝗖𝗵𝗮𝗻𝗴𝗲 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹
│
│ 📝 𝗢𝗹𝗱 𝗣𝗿𝗲𝗳𝗶𝘅: ${oldPrefix}
│ 📝 𝗡𝗲𝘄 𝗣𝗿𝗲𝗳𝗶𝘅: ${newPrefix}
│ 👤 𝗖𝗵𝗮𝗻𝗴𝗲𝗱 𝗕𝘆: @${sender.split('@')[0]}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
│ 💡 𝗡𝗲𝘄 𝗨𝘀𝗮𝗴𝗲:
│    ${newPrefix}help
│    ${newPrefix}menu
│    ${newPrefix}ping
│
│ ✨ 𝗦𝘁𝗮𝘁𝘂𝘀:
│    Active immediately for all users
│
╰────────────⦿

💫 | [ ${config.botName || 'Ilom Bot'} 🍀 ]`,
                mentions: [sender]
            }, { quoted: message });

            if (config.ownerNumbers && config.ownerNumbers.length > 0) {
                for (const ownerNumber of config.ownerNumbers) {
                    if (ownerNumber !== sender) {
                        try {
                            await sock.sendMessage(ownerNumber, {
                                text: `╭──⦿【 🔔 PREFIX UPDATE 】
│
│ ⚠️ Bot prefix has been changed
│
│ 📝 𝗢𝗹𝗱: ${oldPrefix}
│ 📝 𝗡𝗲𝘄: ${newPrefix}
│ 👤 𝗕𝘆: @${sender.split('@')[0]}
│ 📅 ${new Date().toLocaleString()}
│
╰────────────⦿`,
                                mentions: [sender]
                            });
                        } catch (notifyError) {
                            console.error('Failed to notify owner:', notifyError);
                        }
                    }
                }
            }

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Prefix command error:', error);
            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ ERROR 】
│
│ ⚠️ Failed to change prefix
│
│ 📝 Error: ${error.message}
│
│ 💡 Try again later
│
╰────────────⦿`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};