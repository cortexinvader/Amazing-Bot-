import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'setname',
    aliases: ['groupname', 'setgroupname'],
    category: 'admin',
    description: 'Change the group name',
    usage: 'setname [new name]',
    example: 'setname Amazing Group Chat',
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
                    'I need admin privileges to change group name',
                    'Make me an admin first')
            }, { quoted: message });
        }

        try {
            const newName = args.join(' ');
            if (!newName) {
                return await sock.sendMessage(from, {
                    text: formatResponse.error('NO NAME',
                        'Please provide a new group name',
                        'Usage: setname Your New Group Name')
                }, { quoted: message });
            }

            if (newName.length > 25) {
                return await sock.sendMessage(from, {
                    text: formatResponse.error('NAME TOO LONG',
                        'Group name must be 25 characters or less',
                        `Current length: ${newName.length}`)
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
                text: formatResponse.error('UPDATE FAILED',
                    'Failed to update group name',
                    'Make sure I have admin permissions')
            }, { quoted: message });
        }
    }
};
