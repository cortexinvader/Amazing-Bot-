export default {
    name: 'setdesc',
    aliases: ['groupdesc', 'setdescription'],
    category: 'admin',
    description: 'Change the group description',
    usage: 'setdesc [new description]',
    example: 'setdesc Welcome to our group!',
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
            const newDescription = args.join(' ');
            if (!newDescription) {
                return await sock.sendMessage(from, {
                    text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: No description\n│\n│ 💡 Provide new description\n╰────────⦿'
                }, { quoted: message });
            }

            if (newDescription.length > 512) {
                return await sock.sendMessage(from, {
                    text: `╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Too long\n│\n│ 💡 Max 512 characters\n│ Current: ${newDescription.length}\n╰────────⦿`
                }, { quoted: message });
            }

            await sock.groupUpdateDescription(from, newDescription);

            await sock.sendMessage(from, {
                text: `╭──⦿【 📝 DESCRIPTION UPDATED 】
│
│ 📄 𝗡𝗲𝘄 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻:
│ ${newDescription.substring(0, 200)}${newDescription.length > 200 ? '...' : ''}
│
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