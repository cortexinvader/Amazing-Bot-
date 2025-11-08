export default {
    name: 'promote',
    aliases: ['promoteuser', 'makeadmin', 'admin'],
    category: 'admin',
    description: 'Give admin privileges to a user',
    usage: 'promote @user OR reply to message',
    example: 'promote @user\nreply to message: promote',
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
            await sock.sendMessage(from, {
                react: { text: '⏳', key: message.key }
            });

            const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            let usersToPromote = [];
            
            if (quotedUser) {
                usersToPromote = [quotedUser];
            } else if (mentionedUsers.length > 0) {
                usersToPromote = mentionedUsers;
            } else {
                return await sock.sendMessage(from, {
                    text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: No target\n│\n│ 💡 Reply or mention user\n╰────────⦿'
                }, { quoted: message });
            }

            const groupMetadata = await sock.groupMetadata(from);

            const validUsers = [];
            const alreadyAdmins = [];

            for (const targetJid of usersToPromote) {
                const targetUser = groupMetadata.participants.find(p => p.id === targetJid);

                if (!targetUser) {
                    continue;
                }

                if (targetUser.admin === 'admin' || targetUser.admin === 'superadmin') {
                    alreadyAdmins.push(targetJid);
                    continue;
                }

                validUsers.push(targetJid);
            }

            if (validUsers.length === 0) {
                let errorMsg = '╭──⦿【 ⚠️ PROMOTION FAILED 】\n│\n';
                
                if (alreadyAdmins.length > 0) {
                    errorMsg += '│ ℹ️ Already admins:\n';
                    alreadyAdmins.forEach(jid => {
                        errorMsg += `│    • @${jid.split('@')[0]}\n`;
                    });
                }
                
                errorMsg += '╰────────────⦿';

                return await sock.sendMessage(from, {
                    text: errorMsg,
                    mentions: alreadyAdmins
                }, { quoted: message });
            }

            await sock.groupParticipantsUpdate(from, validUsers, 'promote');

            let successMsg = '╭──⦿【 👑 PROMOTION SUCCESS 】\n│\n│ ✅ Promoted users:\n';
            validUsers.forEach(jid => {
                successMsg += `│    • @${jid.split('@')[0]}\n`;
            });
            successMsg += `│\n│ 👮 𝗣𝗿𝗼𝗺𝗼𝘁𝗲𝗱 𝗯𝘆: @${sender.split('@')[0]}\n`;
            successMsg += `│ 📊 𝗧𝗼𝘁𝗮𝗹: ${validUsers.length}\n`;
            successMsg += `│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}\n`;
            successMsg += '╰────────────⦿';

            await sock.sendMessage(from, {
                text: successMsg,
                mentions: [...validUsers, sender]
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Promotion failed\n│\n│ 💡 Try again later\n╰────────⦿'
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};