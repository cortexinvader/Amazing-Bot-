import config from '../../config.js';
import fs from 'fs';
import path from 'path';

export default {
    name: 'sudo',
    aliases: ['addadmin', 'makeadmin'],
    category: 'owner',
    description: 'Add or remove bot admin users',
    usage: 'sudo add/remove [@user]',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,

    async execute({ sock, message, args, from, sender }) {
        try {
            const action = args[0]?.toLowerCase();
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;

            let targetJid;
            if (quotedUser) {
                targetJid = quotedUser;
            } else if (mentionedUsers.length > 0) {
                targetJid = mentionedUsers[0];
            } else {
                return await sock.sendMessage(from, {
                    text: '❌ *No User Specified*\n\nReply to a message or mention a user.\n\n*Usage:*\n• .sudo add @user\n• .sudo remove @user\n• .sudo list'
                }, { quoted: message });
            }

            if (!action || (action !== 'add' && action !== 'remove' && action !== 'list')) {
                return await sock.sendMessage(from, {
                    text: '❌ *Invalid Action*\n\nAvailable actions:\n• add - Add bot admin\n• remove - Remove bot admin\n• list - View all admins\n\n*Usage:* .sudo add @user'
                }, { quoted: message });
            }

            if (action === 'list') {
                const adminList = config.sudoers || [];
                if (adminList.length === 0) {
                    return await sock.sendMessage(from, {
                        text: '📋 *Bot Admin List*\n\nNo bot admins configured.\n\nUse `.sudo add @user` to add admins.'
                    }, { quoted: message });
                }

                let listText = '📋 *Bot Admin List*\n\n';
                adminList.forEach((admin, index) => {
                    const number = admin.replace('@s.whatsapp.net', '');
                    listText += `${index + 1}. @${number}\n`;
                });
                listText += `\n*Total:* ${adminList.length} admins`;

                return await sock.sendMessage(from, {
                    text: listText,
                    mentions: adminList
                }, { quoted: message });
            }

            const targetNumber = targetJid.split('@')[0];

            if (action === 'add') {
                if (config.sudoers.includes(targetJid)) {
                    return await sock.sendMessage(from, {
                        text: `ℹ️ *Already Admin*\n\n@${targetNumber} is already a bot admin.`,
                        mentions: [targetJid]
                    }, { quoted: message });
                }

                config.sudoers.push(targetJid);

                const configPath = path.join(process.cwd(), 'src', 'config.js');
                const configContent = fs.readFileSync(configPath, 'utf8');
                const updatedConfig = configContent.replace(
                    /sudoers:\s*\[([^\]]*)\]/,
                    `sudoers: [${config.sudoers.map(s => `'${s}'`).join(', ')}]`
                );
                fs.writeFileSync(configPath, updatedConfig, 'utf8');

                await sock.sendMessage(from, {
                    text: `✅ *Bot Admin Added*\n\n*User:* @${targetNumber}\n*Added by:* @${sender.split('@')[0]}\n*Date:* ${new Date().toLocaleString()}\n\n@${targetNumber} now has bot admin privileges and can use owner commands.`,
                    mentions: [targetJid, sender]
                }, { quoted: message });

                try {
                    await sock.sendMessage(targetJid, {
                        text: `👑 *You Are Now Bot Admin*\n\n*Added by:* @${sender.split('@')[0]}\n*Date:* ${new Date().toLocaleString()}\n\nYou now have bot admin privileges. Use them responsibly!`,
                        mentions: [sender]
                    });
                } catch (e) {}

            } else if (action === 'remove') {
                if (!config.sudoers.includes(targetJid)) {
                    return await sock.sendMessage(from, {
                        text: `ℹ️ *Not Admin*\n\n@${targetNumber} is not a bot admin.`,
                        mentions: [targetJid]
                    }, { quoted: message });
                }

                config.sudoers = config.sudoers.filter(s => s !== targetJid);

                const configPath = path.join(process.cwd(), 'src', 'config.js');
                const configContent = fs.readFileSync(configPath, 'utf8');
                const updatedConfig = configContent.replace(
                    /sudoers:\s*\[([^\]]*)\]/,
                    `sudoers: [${config.sudoers.map(s => `'${s}'`).join(', ')}]`
                );
                fs.writeFileSync(configPath, updatedConfig, 'utf8');

                await sock.sendMessage(from, {
                    text: `✅ *Bot Admin Removed*\n\n*User:* @${targetNumber}\n*Removed by:* @${sender.split('@')[0]}\n*Date:* ${new Date().toLocaleString()}\n\n@${targetNumber} no longer has bot admin privileges.`,
                    mentions: [targetJid, sender]
                }, { quoted: message });

                try {
                    await sock.sendMessage(targetJid, {
                        text: `⚠️ *Bot Admin Removed*\n\n*Removed by:* @${sender.split('@')[0]}\n*Date:* ${new Date().toLocaleString()}\n\nYour bot admin privileges have been revoked.`,
                        mentions: [sender]
                    });
                } catch (e) {}
            }

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to update bot admin list. Please try again.'
            }, { quoted: message });
        }
    }
};
