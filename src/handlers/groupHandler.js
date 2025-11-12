import logger from '../utils/logger.js';
import handleGroupJoin from '../events/groupJoin.js';
import handleGroupLeave from '../events/groupLeave.js';
import handleGroupUpdate from '../events/groupUpdate.js';

class GroupHandler {
    constructor() {
        this.groupStats = new Map();
    }

    async handleParticipantsUpdate(sock, groupUpdate) {
        try {
            const { id, participants, action, author } = groupUpdate;
            
            logger.debug(`Group ${id}: participants ${action}`, participants);
            
            if (action === 'add') {
                await handleGroupJoin(sock, groupUpdate);
                this.updateStats(id, 'joins', participants.length);
            } else if (action === 'remove' || action === 'leave') {
                await handleGroupLeave(sock, groupUpdate);
                this.updateStats(id, 'leaves', participants.length);
            } else if (action === 'promote' || action === 'demote') {
                await handleGroupUpdate(sock, groupUpdate);
                this.updateStats(id, 'updates', 1);
            }
            
        } catch (error) {
            logger.error('Error handling participants update:', error);
        }
    }

    async handleGroupUpdate(sock, groupsUpdate) {
        try {
            for (const group of groupsUpdate) {
                logger.debug(`Group updated: ${group.id}`, group);
                
                await handleGroupUpdate(sock, group);
                this.updateStats(group.id, 'updates', 1);
            }
        } catch (error) {
            logger.error('Error handling group update:', error);
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