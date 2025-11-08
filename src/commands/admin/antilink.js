import config from '../../config.js';
import { updateGroup, getGroup } from '../../models/Group.js';

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

    async execute({ sock, message, args, from, sender, isGroup, isGroupAdmin, isBotAdmin }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Group only command\n│\n│ 💡 This command works in groups\n╰────────⦿'
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return await sock.sendMessage(from, {
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Admin only\n│\n│ 💡 You need admin privileges\n╰────────⦿'
            }, { quoted: message });
        }

        if (!isBotAdmin) {
            return await sock.sendMessage(from, {
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Bot not admin\n│\n│ 💡 Make me an admin first\n╰────────⦿'
            }, { quoted: message });
        }

        try {
            const action = args[0]?.toLowerCase();
            const group = await getGroup(from);
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
                    text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Invalid option\n│\n│ 💡 Use: on/off, enable/disable\n╰────────⦿'
                }, { quoted: message });
            }

            await updateGroup(from, {
                $set: { 'settings.antiLink': newStatus }
            });

            const statusIcon = newStatus ? '✅' : '❌';
            const actionText = newStatus ? 
                'Links will be automatically deleted' : 
                'Links are now allowed';

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
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Failed to update\n│\n│ 💡 Try again later\n╰────────⦿'
            }, { quoted: message });
        }
    }
};