import logger from '../utils/logger.js';
import config from '../config.js';
import handleGroupJoin from '../events/groupJoin.js';
import handleGroupLeave from '../events/groupLeave.js';

class GroupHandler {
    constructor() {
        this.groupStats = new Map();
    }

    async handleParticipantsUpdate(sock, groupUpdate) {
        try {
            const { id, participants, action, author } = groupUpdate;
            
            logger.info(`Group participants update: ${id} - Action: ${action} - Participants: ${participants?.length || 0}`);
            
            if (action === 'add') {
                logger.info(`Handling group join for ${participants.length} users in ${id}`);
                await handleGroupJoin(sock, groupUpdate);
                this.updateStats(id, 'joins', participants.length);
            } else if (action === 'remove' || action === 'leave') {
                logger.info(`Handling group leave for ${participants.length} users in ${id}`);
                await handleGroupLeave(sock, groupUpdate);
                this.updateStats(id, 'leaves', participants.length);
            } else if (action === 'promote') {
                logger.info(`Handling group promote for ${participants.length} users in ${id}`);
                if (config.events.groupPromote) {
                    await this.handleGroupPromote(sock, groupUpdate);
                }
                this.updateStats(id, 'updates', 1);
            } else if (action === 'demote') {
                logger.info(`Handling group demote for ${participants.length} users in ${id}`);
                if (config.events.groupDemote) {
                    await this.handleGroupDemote(sock, groupUpdate);
                }
                this.updateStats(id, 'updates', 1);
            }
            
        } catch (error) {
            logger.error('Error handling participants update:', error);
        }
    }

    async handleGroupPromote(sock, groupUpdate) {
        try {
            const { id: groupId, participants, author } = groupUpdate;
            
            const groupMetadata = await sock.groupMetadata(groupId);
            const groupName = groupMetadata.subject || 'Group';
            
            for (const participant of participants) {
                const userName = participant.split('@')[0];
                const authorName = author ? author.split('@')[0] : 'Admin';
                
                const promoteMessage = `╭──⦿【 👑 PROMOTION 】
│
│ 🎉 Congratulations @${userName}!
│ ⬆️ You are now a Group Admin
│ 👨‍💼 Promoted by: @${authorName}
│ 💼 Use your power wisely!
│
╰────────────⦿`;
                
                await sock.sendMessage(groupId, {
                    text: promoteMessage,
                    mentions: [participant, author].filter(Boolean)
                });
                
                logger.info(`Promote notification sent for ${userName} in ${groupName}`);
            }
        } catch (error) {
            logger.error('Error handling group promote:', error);
        }
    }

    async handleGroupDemote(sock, groupUpdate) {
        try {
            const { id: groupId, participants, author } = groupUpdate;
            
            const groupMetadata = await sock.groupMetadata(groupId);
            const groupName = groupMetadata.subject || 'Group';
            
            for (const participant of participants) {
                const userName = participant.split('@')[0];
                const authorName = author ? author.split('@')[0] : 'Admin';
                
                const demoteMessage = `╭──⦿【 ⬇️ DEMOTION 】
│
│ 📉 @${userName} is no longer an admin
│ 👮 Demoted by: @${authorName}
│ 👤 Now a regular member
│
╰────────────⦿`;
                
                await sock.sendMessage(groupId, {
                    text: demoteMessage,
                    mentions: [participant, author].filter(Boolean)
                });
                
                logger.info(`Demote notification sent for ${userName} in ${groupName}`);
            }
        } catch (error) {
            logger.error('Error handling group demote:', error);
        }
    }

    async handleGroupUpdate(sock, groupsUpdate) {
        if (!config.events.groupUpdate) {
            return;
        }

        try {
            for (const group of groupsUpdate) {
                logger.debug(`Group updated: ${group.id}`, group);
                
                if (group.subject) {
                    await this.handleGroupNameChange(sock, group);
                }
                
                if (group.desc !== undefined) {
                    await this.handleGroupDescChange(sock, group);
                }
                
                this.updateStats(group.id, 'updates', 1);
            }
        } catch (error) {
            logger.error('Error handling group update:', error);
        }
    }

    async handleGroupNameChange(sock, group) {
        try {
            const { id: groupId, subject: newSubject, author } = group;
            const authorName = author ? author.split('@')[0] : 'Admin';
            
            const updateMessage = `╭──⦿【 📝 GROUP NAME CHANGED 】
│
│ 🔄 Group name updated
│ 📛 New: ${newSubject}
│ 👨‍💼 Changed by: @${authorName}
│
╰────────────⦿`;
            
            await sock.sendMessage(groupId, {
                text: updateMessage,
                mentions: author ? [author] : []
            });
            
            logger.info(`Group name change notification sent in ${newSubject}`);
        } catch (error) {
            logger.error('Error sending group name change notification:', error);
        }
    }

    async handleGroupDescChange(sock, group) {
        try {
            const { id: groupId, desc: newDesc, author } = group;
            const authorName = author ? author.split('@')[0] : 'Admin';
            
            const updateMessage = `╭──⦿【 📝 DESCRIPTION CHANGED 】
│
│ 📋 Group description updated
│ 👨‍💼 Changed by: @${authorName}
│
│ 📄 New Description:
│ ${newDesc || 'No description'}
│
╰────────────⦿`;
            
            await sock.sendMessage(groupId, {
                text: updateMessage,
                mentions: author ? [author] : []
            });
            
            logger.info(`Group description change notification sent`);
        } catch (error) {
            logger.error('Error sending group description change notification:', error);
        }
    }

    updateStats(groupId, type, count) {
        if (!this.groupStats.has(groupId)) {
            this.groupStats.set(groupId, {
                joins: 0,
                leaves: 0,
                updates: 0
            });
        }
        
        const stats = this.groupStats.get(groupId);
        stats[type] += count;
        this.groupStats.set(groupId, stats);
    }

    getGroupStats(groupId = null) {
        if (groupId) {
            return this.groupStats.get(groupId) || { joins: 0, leaves: 0, updates: 0 };
        }
        
        return {
            totalGroups: this.groupStats.size,
            updates: Array.from(this.groupStats.values()).reduce((acc, stats) => acc + stats.updates, 0),
            joins: Array.from(this.groupStats.values()).reduce((acc, stats) => acc + stats.joins, 0),
            leaves: Array.from(this.groupStats.values()).reduce((acc, stats) => acc + stats.leaves, 0)
        };
    }
}

export default new GroupHandler();