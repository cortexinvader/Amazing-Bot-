export default {
    name: 'setname',
    aliases: ['groupname', 'setgroupname'],
    category: 'admin',
    description: 'Change the group name',
    usage: 'setname [new name]',
    example: 'setname Amazing Group',
    cooldown: 10,
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
            const newName = args.join(' ');
            if (!newName) {
                return await sock.sendMessage(from, {
                    text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: No name provided\n│\n│ 💡 Provide new group name\n╰────────⦿'
                }, { quoted: message });
            }

            if (newName.length > 25) {
                return await sock.sendMessage(from, {
                    text: `╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Name too long\n│\n│ 💡 Max 25 characters\n│ Current: ${newName.length}\n╰────────⦿`
                }, { quoted: message });
            }

            const groupMetadata = await sock.groupMetadata(from);
            const oldName = groupMetadata.subject;

            await sock.groupUpdateSubject(from, newName);

            await sock.sendMessage(from, {
                text: `╭──⦿【 📝 GROUP NAME UPDATED 】
│
│ 📛 𝗢𝗹𝗱 𝗡𝗮𝗺𝗲: ${oldName}
│ 📛 𝗡𝗲𝘄 𝗡𝗮𝗺𝗲: ${newName}
│ 👮 𝗖𝗵𝗮𝗻𝗴𝗲𝗱 𝗯𝘆: @${sender.split('@')[0]}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
╰────────────⦿`,
                mentions: [sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Update failed\n│\n│ 💡 Try again later\n╰────────⦿'
            }, { quoted: message });
        }
    }
};