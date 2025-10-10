import logger from '../utils/logger.js';
import config from '../config.js';
import { getGroup, updateGroup } from '../models/Group.js';
import { createGoodbyeImage } from '../utils/canvasUtils.js';

export default async function handleGroupLeave(sock, update) {
    try {
        const { id: groupId, participants, action, author } = update;
        
        if (action !== 'remove') return;
        
        const group = await getGroup(groupId);
        if (!group || !group.settings?.goodbye?.enabled) return;
        
        const groupMetadata = await sock.groupMetadata(groupId);
        const groupName = groupMetadata.subject || 'Group';
        
        for (const participant of participants) {
            try {
                const userName = participant.split('@')[0];
                
                const goodbyeImage = await createGoodbyeImage(userName, groupName);
                
                const isKicked = author && author !== participant;
                
                const goodbyeMessage = isKicked
                    ? `╭──⦿【 👋 GOODBYE 】\n│\n│ 🚪 @${userName} was removed\n│ 👮 By: @${author.split('@')[0]}\n│ 📉 Group now has ${groupMetadata.participants.length} members\n│\n╰────────────⦿`
                    : `╭──⦿【 👋 GOODBYE 】\n│\n│ 🚪 @${userName} has left\n│ 😢 We'll miss you!\n│ 📉 Group now has ${groupMetadata.participants.length} members\n│\n╰────────────⦿`;
                
                const mentionsList = [participant];
                if (author && isKicked) {
                    mentionsList.push(author);
                }
                
                await sock.sendMessage(groupId, {
                    image: goodbyeImage,
                    caption: goodbyeMessage,
                    mentions: mentionsList
                });
                
                await updateGroup(groupId, {
                    $inc: { 'stats.totalLeaves': 1 }
                });
                
                logger.info(`Goodbye sent for ${userName} in ${groupName}`);
                
            } catch (error) {
                logger.error(`Error sending goodbye for ${participant}:`, error);
            }
        }
        
    } catch (error) {
        logger.error('Error in groupLeave event:', error);
    }
}
