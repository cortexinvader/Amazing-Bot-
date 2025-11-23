import logger from '../utils/logger.js';
import config from '../config.js';
import { getGroup, updateGroup } from '../models/Group.js';
import axios from 'axios';

async function getProfilePicture(sock, jid) {
    try {
        const url = await sock.profilePictureUrl(jid, 'image');
        return url;
    } catch (error) {
        return 'https://i.ibb.co/2M7rtLk/ilom.jpg';
    }
}

async function downloadProfilePic(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    } catch (error) {
        return null;
    }
}

export default async function handleGroupLeave(sock, update) {
    try {
        if (!config.events.groupLeave) {
            logger.debug('Group leave event is disabled');
            return;
        }

        const { id: groupId, participants, action, author } = update;
        
        if (action !== 'remove' && action !== 'leave') {
            logger.debug(`Ignoring action: ${action} (not remove/leave)`);
            return;
        }
        
        logger.info(`Processing group leave for ${participants.length} users in ${groupId}`);

        let group = await getGroup(groupId);
        const groupMetadata = await sock.groupMetadata(groupId);
        const groupName = groupMetadata.subject || 'Group';
        const memberCount = groupMetadata.participants.length;
        
        for (const participant of participants) {
            try {
                const userName = participant.split('@')[0];
                const isKicked = author && author !== participant;
                
                logger.info(`Sending goodbye to ${userName} in ${groupName} (${isKicked ? 'kicked' : 'left'})`);

                const profilePicUrl = await getProfilePicture(sock, participant);
                const profilePicBuffer = await downloadProfilePic(profilePicUrl);
                
                const goodbyeText = isKicked
                    ? `╭━━━━━⦿「 👋 GOODBYE 」⦿━━━━━╮
│
│  🚪 @${userName} was removed
│  👮 By: @${author.split('@')[0]}
│  📉 Group now has ${memberCount} members
│  💔 Goodbye!
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

💫 ${config.botName} 🍀`
                    : `╭━━━━━⦿「 👋 GOODBYE 」⦿━━━━━╮
│
│  🚪 @${userName} has left
│  😢 We'll miss you!
│  📉 Group now has ${memberCount} members
│  👋 Take care!
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

💫 ${config.botName} 🍀`;
                
                const mentionsList = isKicked ? [participant, author] : [participant];
                
                if (profilePicBuffer) {
                    await sock.sendMessage(groupId, {
                        image: profilePicBuffer,
                        caption: goodbyeText,
                        mentions: mentionsList
                    });
                } else {
                    await sock.sendMessage(groupId, {
                        text: goodbyeText,
                        mentions: mentionsList
                    });
                }
                
                logger.info(`✅ Goodbye sent for ${userName} in ${groupName}`);
                
                if (group) {
                    try {
                        await updateGroup(groupId, {
                            $inc: { 'stats.totalLeaves': 1 }
                        });
                    } catch (dbError) {
                        logger.debug(`Group stats update skipped: ${dbError.message}`);
                    }
                }
                
            } catch (error) {
                logger.error(`Error sending goodbye for ${participant}:`, error);
                
                try {
                    const userName = participant.split('@')[0];
                    const isKicked = author && author !== participant;
                    
                    const fallbackText = isKicked
                        ? `╭━━━━━⦿「 👋 GOODBYE 」⦿━━━━━╮
│
│  🚪 @${userName} was removed
│  👮 By: @${author.split('@')[0]}
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
                        : `╭━━━━━⦿「 👋 GOODBYE 」⦿━━━━━╮
│
│  🚪 @${userName} has left
│  😢 We'll miss you!
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

                    const mentionsList = isKicked ? [participant, author] : [participant];

                    await sock.sendMessage(groupId, {
                        text: fallbackText,
                        mentions: mentionsList
                    });
                } catch (fallbackError) {
                    logger.error(`Fallback goodbye failed:`, fallbackError);
                }
            }
        }
        
    } catch (error) {
        logger.error('Error in groupLeave event:', error);
    }
}