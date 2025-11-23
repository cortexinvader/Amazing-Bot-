import logger from '../utils/logger.js';
import config from '../config.js';
import { getGroup, updateGroup } from '../models/Group.js';
import { getUser, createUser } from '../models/User.js';
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

export default async function handleGroupJoin(sock, update) {
    try {
        if (!config.events.groupJoin) {
            logger.debug('Group join event is disabled');
            return;
        }

        const { id: groupId, participants, action, author } = update;
        
        if (action !== 'add') {
            logger.debug(`Ignoring action: ${action} (not add)`);
            return;
        }
        
        logger.info(`Processing group join for ${participants.length} users in ${groupId}`);

        let group = await getGroup(groupId);
        const groupMetadata = await sock.groupMetadata(groupId);
        const groupName = groupMetadata.subject || 'Group';
        const memberCount = groupMetadata.participants.length;
        
        for (const participant of participants) {
            try {
                const phoneNumber = participant.split('@')[0].replace(/:\d+/, '');
                const userContact = groupMetadata.participants.find(p => p.id === participant);
                const displayName = userContact?.notify || phoneNumber;
                
                logger.info(`Sending welcome to ${displayName} in ${groupName}`);

                const profilePicUrl = await getProfilePicture(sock, participant);
                const profilePicBuffer = await downloadProfilePic(profilePicUrl);
                
                const welcomeText = `╭━━━━━⦿「 🎉 WELCOME 」⦿━━━━━╮
│
│  👋 𝗪𝗲𝗹𝗰𝗼𝗺𝗲 @${phoneNumber}!
│
│  🎊 You are member #${memberCount}
│  🌟 Group: ${groupName}
│  📋 Please read group rules
│  🤝 Enjoy your stay!
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

⚡ Type ${config.prefix || '.'}menu to see bot commands

💫 ${config.botName} 🍀`;

                if (profilePicBuffer) {
                    await sock.sendMessage(groupId, {
                        image: profilePicBuffer,
                        caption: welcomeText,
                        mentions: [participant]
                    });
                } else {
                    await sock.sendMessage(groupId, {
                        text: welcomeText,
                        mentions: [participant]
                    });
                }
                
                logger.info(`✅ Welcome sent to ${displayName} in ${groupName}`);
                
                try {
                    await createUser({
                        jid: participant,
                        phone: phoneNumber,
                        name: displayName,
                        firstSeen: new Date()
                    });
                } catch (dbError) {
                    logger.debug(`User creation skipped: ${dbError.message}`);
                }
                
                if (group) {
                    try {
                        await updateGroup(groupId, {
                            $inc: { 'stats.totalJoins': 1 }
                        });
                    } catch (dbError) {
                        logger.debug(`Group stats update skipped: ${dbError.message}`);
                    }
                }
                
            } catch (error) {
                logger.error(`Error welcoming ${participant}:`, error);
                
                try {
                    const phoneNumber = participant.split('@')[0].replace(/:\d+/, '');
                    const fallbackText = `╭━━━━━⦿「 🎉 WELCOME 」⦿━━━━━╮
│
│  👋 𝗪𝗲𝗹𝗰𝗼𝗺𝗲 @${phoneNumber}!
│
│  🎊 You are member #${memberCount}
│  🌟 Group: ${groupName}
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

                    await sock.sendMessage(groupId, {
                        text: fallbackText,
                        mentions: [participant]
                    });
                } catch (fallbackError) {
                    logger.error(`Fallback welcome failed:`, fallbackError);
                }
            }
        }
        
    } catch (error) {
        logger.error('Error in groupJoin event:', error);
    }
}