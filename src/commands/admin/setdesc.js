import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'setdesc',
    aliases: ['groupdesc', 'setdescription'],
    category: 'admin',
    description: 'Change the group description',
    usage: 'setdesc [new description]',
    example: 'setdesc Welcome to our awesome group!',
    cooldown: 10,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, args, from, sender, isGroup, isGroupAdmin, isBotAdmin }) {
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
                    'I need admin privileges to change group description',
                    'Make me an admin first')
            }, { quoted: message });
        }

        try {
            const newDescription = args.join(' ');
            if (!newDescription) {
                return await sock.sendMessage(from, {
                    text: formatResponse.error('NO DESCRIPTION',
                        'Please provide a new description',
                        'Usage: setdesc Your new group description here')
                }, { quoted: message });
            }

            if (newDescription.length > 512) {
                return await sock.sendMessage(from, {
                    text: formatResponse.error('DESCRIPTION TOO LONG',
                        'Group description must be 512 characters or less',
                        `Current length: ${newDescription.length}`)
                }, { quoted: message });
            }

            await sock.groupUpdateDescription(from, newDescription);

            await sock.sendMessage(from, {
                text: `╭──⦿【 📝 GROUP DESCRIPTION UPDATED 】
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
                text: formatResponse.error('UPDATE FAILED',
                    'Failed to update group description',
                    'Make sure I have admin permissions')
            }, { quoted: message });
        }
    }
};
