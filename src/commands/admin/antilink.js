import config from '../../config.js';
import { updateGroup } from '../../models/Group.js';
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'antilink',
    aliases: ['anti-link', 'linkprotection'],
    category: 'admin',
    description: 'Toggle antilink protection in the group',
    usage: 'antilink [on/off]',
    example: 'antilink on',
    cooldown: 5,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, args, from, sender, group, isGroup, isGroupAdmin, isBotAdmin }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: formatResponse.error('GROUP ONLY',
                    'This command can only be used in groups')
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return await sock.sendMessage(from, {
                text: formatResponse.error('ADMIN ONLY',
                    'You need to be a group admin to use this command')
            }, { quoted: message });
        }

        if (!isBotAdmin) {
            return await sock.sendMessage(from, {
                text: formatResponse.error('BOT NOT ADMIN',
                    'I need admin privileges to manage antilink protection',
                    'Make me an admin first')
            }, { quoted: message });
        }

        try {
            const action = args[0]?.toLowerCase();
            const currentStatus = group?.settings?.antiLink || false;

            if (!action) {
                return await sock.sendMessage(from, {
                    text: `╭──⦿【 🔗 ANTILINK STATUS 】
│
│ 📊 𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗦𝘁𝗮𝘁𝘂𝘀: ${currentStatus ? '✅ Enabled' : '❌ Disabled'}
│
│ 💡 𝗨𝘀𝗮𝗴𝗲: ${config.prefix}antilink [on/off]
│ 📝 𝗘𝘅𝗮𝗺𝗽𝗹𝗲: ${config.prefix}antilink on
│
╰────────────⦿`
                }, { quoted: message });
            }

            let newStatus;
            if (action === 'on' || action === 'enable' || action === '1' || action === 'true') {
                newStatus = true;
            } else if (action === 'off' || action === 'disable' || action === '0' || action === 'false') {
                newStatus = false;
            } else {
                return await sock.sendMessage(from, {
                    text: formatResponse.error('INVALID OPTION',
                        'Use: on/off, enable/disable, or 1/0',
                        'Example: antilink on')
                }, { quoted: message });
            }

            await updateGroup(from, {
                $set: { 'settings.antiLink': newStatus }
            });

            const statusIcon = newStatus ? '✅' : '❌';
            const actionText = newStatus ? 
                'Links will be automatically deleted and users warned' : 
                'Links are now allowed in this group';

            await sock.sendMessage(from, {
                text: `╭──⦿【 🔗 ANTILINK ${newStatus ? 'ENABLED' : 'DISABLED'} 】
│
│ 📊 𝗦𝘁𝗮𝘁𝘂𝘀: ${statusIcon} ${newStatus ? 'Enabled' : 'Disabled'}
│ 👮 𝗕𝘆: @${sender.split('@')[0]}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
│ 💡 ${actionText}
│
╰────────────⦿`,
                mentions: [sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('UPDATE FAILED',
                    'Failed to update antilink settings',
                    error.message)
            }, { quoted: message });
        }
    }
};
