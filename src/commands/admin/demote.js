import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'demote',
    aliases: ['demoteuser', 'removeadmin', 'unadmin'],
    category: 'admin',
    description: 'Remove admin privileges from a user',
    usage: 'demote @user OR reply to message',
    example: 'demote @user\nreply to message: demote',
    cooldown: 5,
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

        try {
            await sock.sendMessage(from, {
                react: { text: '⏳', key: message.key }
            });

            const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            let usersToDemote = [];
            
            if (quotedUser) {
                usersToDemote = [quotedUser];
            } else if (mentionedUsers.length > 0) {
                usersToDemote = mentionedUsers;
            } else {
                return await sock.sendMessage(from, {
                    text: formatResponse.error('NO TARGET',
                        'Reply to a message or mention user(s) to demote',
                        'Usage: demote @user OR reply to message and type: demote')
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
                        'I need admin privileges to demote users',
                        'Make me an admin first')
                }, { quoted: message });
            }

            const validUsers = [];
            const notAdmins = [];
            const notFound = [];
            const cannotDemote = [];

            for (const targetJid of usersToDemote) {
                const targetUser = groupMetadata.participants.find(p => p.id === targetJid);

                if (!targetUser) {
                    notFound.push(targetJid);
                    continue;
                }

                if (targetUser.admin === 'superadmin') {
                    cannotDemote.push(targetJid);
                    continue;
                }

                if (!targetUser.admin || targetUser.admin === null) {
                    notAdmins.push(targetJid);
                    continue;
                }

                validUsers.push(targetJid);
            }

            if (validUsers.length === 0) {
                let errorMsg = '╭──⦿【 ⚠️ DEMOTION FAILED 】\n│\n';
                
                if (notAdmins.length > 0) {
                    errorMsg += '│ ℹ️ Not admins:\n';
                    notAdmins.forEach(jid => {
                        errorMsg += `│    • @${jid.split('@')[0]}\n`;
                    });
                    errorMsg += '│\n';
                }
                
                if (cannotDemote.length > 0) {
                    errorMsg += '│ 🚫 Cannot demote (super admin):\n';
                    cannotDemote.forEach(jid => {
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
                    mentions: [...notAdmins, ...cannotDemote, ...notFound]
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                text: `╭──⦿【 ⏳ DEMOTING 】
│
│ 🔄 Processing ${validUsers.length} user(s)...
│
╰────────────⦿`
            }, { quoted: message });

            try {
                await sock.groupParticipantsUpdate(from, validUsers, 'demote');

                let successMsg = '╭──⦿【 👤 DEMOTION SUCCESS 】\n│\n│ ✅ Demoted users:\n';
                validUsers.forEach(jid => {
                    successMsg += `│    • @${jid.split('@')[0]}\n`;
                });
                successMsg += `│\n│ 👮 𝗗𝗲𝗺𝗼𝘁𝗲𝗱 𝗯𝘆: @${sender.split('@')[0]}\n`;
                successMsg += `│ 📊 𝗧𝗼𝘁𝗮𝗹: ${validUsers.length}\n`;
                successMsg += `│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}\n`;
                successMsg += `│ ⏰ 𝗧𝗶𝗺𝗲: ${new Date().toLocaleTimeString()}\n│\n`;
                successMsg += '│ 📉 Removed privileges:\n';
                successMsg += '│    • Cannot manage group settings\n';
                successMsg += '│    • Cannot add/remove members\n';
                successMsg += '│    • Cannot promote/demote users\n';
                successMsg += '│    • Cannot change group info\n│\n';
                successMsg += '│ ✨ Now regular members\n│\n';
                
                if (notAdmins.length > 0) {
                    successMsg += '│ ℹ️ Not admins (skipped):\n';
                    notAdmins.forEach(jid => {
                        successMsg += `│    • @${jid.split('@')[0]}\n`;
                    });
                    successMsg += '│\n';
                }
                
                if (cannotDemote.length > 0) {
                    successMsg += '│ 🚫 Cannot demote (super admin):\n';
                    cannotDemote.forEach(jid => {
                        successMsg += `│    • @${jid.split('@')[0]}\n`;
                    });
                    successMsg += '│\n';
                }
                
                successMsg += '╰────────────⦿';

                await sock.sendMessage(from, {
                    text: successMsg,
                    mentions: [...validUsers, sender, ...notAdmins, ...cannotDemote]
                }, { quoted: message });

                await sock.sendMessage(from, {
                    react: { text: '✅', key: message.key }
                });

            } catch (demoteError) {
                console.error('Demote error:', demoteError);
                
                await sock.sendMessage(from, {
                    text: formatResponse.error('DEMOTION FAILED',
                        'Failed to demote user(s)',
                        demoteError.message || 'Make sure I have admin permissions and user is an admin')
                }, { quoted: message });

                await sock.sendMessage(from, {
                    react: { text: '❌', key: message.key }
                });
            }

        } catch (error) {
            console.error('Demote command error:', error);
            await sock.sendMessage(from, {
                text: formatResponse.error('DEMOTION FAILED',
                    'An error occurred while demoting users',
                    error.message || 'Please try again')
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};