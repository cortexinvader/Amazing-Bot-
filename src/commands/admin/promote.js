import formatResponse from '../../utils/formatUtils.js';

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

    async execute({ sock, message, args, from, sender, isGroup, isGroupAdmin, isBotAdmin}) {
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
                    text: formatResponse.error('NO TARGET',
                        'Reply to a message or mention user(s) to promote',
                        'Usage: promote @user OR reply to message and type: promote')
                }, { quoted: message });
            }

            const groupMetadata = await sock.groupMetadata(from);
            const botJid = sock.user.id;
            
            const botParticipant = groupMetadata.participants.find(p => {
                if (p.id === botJid) return true;
                
                const botPhone = botJid.split('@')[0].split(':')[0];
                const pPhone = p.id.split('@')[0].split(':')[0];
                const pLidPhone = p.lid ? p.lid.split('@')[0].split(':')[0] : null;
                
                return pPhone === botPhone || pLidPhone === botPhone;
            });

            if (!botParticipant || (!botParticipant.admin)) {
                return await sock.sendMessage(from, {
                    text: formatResponse.error('BOT NOT ADMIN',
                        'I need admin privileges to promote users',
                        'Make me an admin first')
                }, { quoted: message });
            }

            const validUsers = [];
            const alreadyAdmins = [];
            const notFound = [];

            for (const targetJid of usersToPromote) {
                const targetUser = groupMetadata.participants.find(p => p.id === targetJid);

                if (!targetUser) {
                    notFound.push(targetJid);
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
                    errorMsg += '│\n';
                }
                
                if (notFound.length > 0) {
                    errorMsg += '│ ❌ Not in group:\n';
                    notFound.forEach(jid => {
                        errorMsg += `│    • @${jid.split('@')[0]}\n`;
                    });
                    errorMsg += '│\n';
                }
                
                errorMsg += '╰────────────⦿';

                return await sock.sendMessage(from, {
                    text: errorMsg,
                    mentions: [...alreadyAdmins, ...notFound]
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                text: `╭──⦿【 ⏳ PROMOTING 】
│
│ 🔄 Processing ${validUsers.length} user(s)...
│
╰────────────⦿`
            }, { quoted: message });

            try {
                await sock.groupParticipantsUpdate(from, validUsers, 'promote');

                let successMsg = '╭──⦿【 👑 PROMOTION SUCCESS 】\n│\n│ ✅ Promoted users:\n';
                validUsers.forEach(jid => {
                    successMsg += `│    • @${jid.split('@')[0]}\n`;
                });
                successMsg += `│\n│ 👮 𝗣𝗿𝗼𝗺𝗼𝘁𝗲𝗱 𝗯𝘆: @${sender.split('@')[0]}\n`;
                successMsg += `│ 📊 𝗧𝗼𝘁𝗮𝗹: ${validUsers.length}\n`;
                successMsg += `│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}\n`;
                successMsg += `│ ⏰ 𝗧𝗶𝗺𝗲: ${new Date().toLocaleTimeString()}\n│\n`;
                successMsg += '│ 💼 New privileges:\n';
                successMsg += '│    • Can manage group settings\n';
                successMsg += '│    • Can add/remove members\n';
                successMsg += '│    • Can promote/demote users\n';
                successMsg += '│    • Can change group info\n│\n';
                
                if (alreadyAdmins.length > 0) {
                    successMsg += '│ ℹ️ Already admins (skipped):\n';
                    alreadyAdmins.forEach(jid => {
                        successMsg += `│    • @${jid.split('@')[0]}\n`;
                    });
                    successMsg += '│\n';
                }
                
                successMsg += '╰────────────⦿';

                await sock.sendMessage(from, {
                    text: successMsg,
                    mentions: [...validUsers, sender, ...alreadyAdmins]
                }, { quoted: message });

                await sock.sendMessage(from, {
                    react: { text: '✅', key: message.key }
                });

            } catch (promoteError) {
                console.error('Promote error:', promoteError);
                
                await sock.sendMessage(from, {
                    text: formatResponse.error('PROMOTION FAILED',
                        'Failed to promote user(s)',
                        promoteError.message || 'Make sure I have admin permissions')
                }, { quoted: message });

                await sock.sendMessage(from, {
                    react: { text: '❌', key: message.key }
                });
            }

        } catch (error) {
            console.error('Promote command error:', error);
            await sock.sendMessage(from, {
                text: formatResponse.error('PROMOTION FAILED',
                    'An error occurred while promoting users',
                    error.message || 'Please try again')
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};