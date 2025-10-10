import logger from '../utils/logger.js';
import config from '../config.js';
import { getGroup, updateGroup } from '../models/Group.js';
import { getUser, createUser } from '../models/User.js';
import { createWelcomeImage } from '../utils/canvasUtils.js';
import axios from 'axios';

export default async function handleGroupJoin(sock, update) {
    try {
        const { id: groupId, participants, action, author } = update;
        
        if (action !== 'add') return;
        
        const group = await getGroup(groupId);
        if (!group || !group.settings?.welcome?.enabled) return;
        
        const groupMetadata = await sock.groupMetadata(groupId);
        const groupName = groupMetadata.subject || 'Group';
        const memberCount = groupMetadata.participants.length;
        
        for (const participant of participants) {
            try {
                let profilePicUrl = 'https://i.ibb.co/2M7rtLk/ilom.jpg';
                try {
                    profilePicUrl = await sock.profilePictureUrl(participant, 'image');
                } catch (error) {
                    logger.debug(`No profile picture for ${participant}`);
                }
                
                const userName = participant.split('@')[0];
                const userContact = groupMetadata.participants.find(p => p.id === participant);
                const displayName = userContact?.notify || userName;
                
                const welcomeImage = await createWelcomeImage(displayName, groupName, memberCount, profilePicUrl);
                
                const welcomeMessage = group.settings?.welcome?.message || 
                    `╭──⦿【 ✨ WELCOME 】\n│\n│ 👋 Welcome @${userName}!\n│\n│ 🎉 You are member #${memberCount}\n│ 📋 Please read group rules\n│ 🤝 Enjoy your stay in ${groupName}\n│\n╰────────────⦿`;
                
                await sock.sendMessage(groupId, {
                    image: welcomeImage,
                    caption: welcomeMessage,
                    mentions: [participant]
                });
                
                await createUser({
                    jid: participant,
                    name: displayName,
                    firstSeen: new Date()
                });
                
                await updateGroup(groupId, {
                    $inc: { 'stats.totalJoins': 1 }
                });
                
                logger.info(`Welcome sent to ${displayName} in ${groupName}`);
                
            } catch (error) {
                logger.error(`Error welcoming ${participant}:`, error);
            }
        }
        
    } catch (error) {
        logger.error('Error in groupJoin event:', error);
    }
}
