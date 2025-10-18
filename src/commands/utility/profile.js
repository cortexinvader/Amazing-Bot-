import { getUser } from '../../models/User.js';
import config from '../../config.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs-extra';

const userMessageCounts = new Map();
const userDeletedCounts = new Map();
const userJoinDates = new Map();

const FONT_PRIMARY = path.join(process.cwd(), 'src', 'assets', 'fonts', 'primary.ttf');
const FONT_SECONDARY = path.join(process.cwd(), 'src', 'assets', 'fonts', 'secondary.ttf');

let fontsLoaded = false;

async function loadFonts() {
    if (fontsLoaded) return;
    try {
        if (await fs.pathExists(FONT_PRIMARY)) {
            GlobalFonts.registerFromPath(FONT_PRIMARY, 'Primary');
        }
        if (await fs.pathExists(FONT_SECONDARY)) {
            GlobalFonts.registerFromPath(FONT_SECONDARY, 'Secondary');
        }
        fontsLoaded = true;
    } catch (e) {}
}

export default {
    name: 'profile',
    aliases: ['prof', 'whois', 'userinfo'],
    category: 'utility',
    description: 'View detailed user profile with beautiful card design',
    usage: 'profile [@user/reply]',
    example: 'profile\nprofile @user',
    cooldown: 5,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,

    async execute({ sock, message, from, sender, isGroup, prefix }) {
        let targetSender = sender;

        const replied = message.message?.extendedTextMessage?.contextInfo?.participant;
        if (replied) {
            targetSender = replied;
        } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
            targetSender = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }

        try {
            await sock.sendMessage(from, {
                react: { text: '⏳', key: message.key }
            });

            const userData = await getUser(targetSender);
            const userName = userData?.name || message.pushName || 'Unknown User';
            const phone = targetSender.split('@')[0];

            let profilePic = null;
            try {
                profilePic = await sock.profilePictureUrl(targetSender, 'image');
            } catch (e) {
                profilePic = null;
            }

            let onlineStatus = '🔴 Offline';
            let statusEmoji = '🔴';

            try {
                await sock.presenceSubscribe(targetSender);
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                const presenceStore = sock.presenceCache || new Map();
                const userPresence = presenceStore.get(targetSender);

                if (userPresence) {
                    const presence = userPresence.lastKnownPresence;
                    const lastSeen = userPresence.lastSeen;

                    if (presence === 'available') {
                        onlineStatus = 'Online';
                        statusEmoji = '🟢';
                    } else if (presence === 'composing') {
                        onlineStatus = 'Typing...';
                        statusEmoji = '💬';
                    } else if (presence === 'recording') {
                        onlineStatus = 'Recording...';
                        statusEmoji = '🎤';
                    } else if (lastSeen) {
                        const lastSeenTime = new Date(lastSeen * 1000);
                        const now = new Date();
                        const diffMs = now - lastSeenTime;
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMins / 60);
                        const diffDays = Math.floor(diffHours / 24);

                        if (diffMins < 1) {
                            onlineStatus = 'Just now';
                            statusEmoji = '🟡';
                        } else if (diffMins < 60) {
                            onlineStatus = `${diffMins}m ago`;
                            statusEmoji = '🟡';
                        } else if (diffHours < 24) {
                            onlineStatus = `${diffHours}h ago`;
                            statusEmoji = '🟠';
                        } else {
                            onlineStatus = `${diffDays}d ago`;
                            statusEmoji = '🔴';
                        }
                    }
                }
            } catch (e) {
                onlineStatus = 'Offline';
                statusEmoji = '🔴';
            }

            let bio = 'No bio set';
            try {
                const statusResponse = await sock.fetchStatus(targetSender);
                if (statusResponse?.status) {
                    bio = statusResponse.status.substring(0, 50);
                    if (statusResponse.status.length > 50) bio += '...';
                }
            } catch (e) {}

            let messageCount = 0;
            let deletedCount = 0;
            let joinDate = 'Unknown';
            let groupRole = 'Member';
            let roleEmoji = '👤';

            if (isGroup) {
                const msgKey = `${targetSender}_${from}`;
                messageCount = userMessageCounts.get(msgKey) || 0;
                deletedCount = userDeletedCounts.get(msgKey) || 0;
                
                const joinTs = userJoinDates.get(msgKey);
                if (joinTs) {
                    const date = new Date(joinTs);
                    joinDate = date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    });
                }

                try {
                    const groupMetadata = await sock.groupMetadata(from);
                    const participant = groupMetadata.participants.find(p => 
                        p.id === targetSender || 
                        (p.lid && p.lid === targetSender)
                    );
                    
                    if (participant) {
                        if (participant.admin === 'superadmin') {
                            groupRole = 'Owner';
                            roleEmoji = '👑';
                        } else if (participant.admin === 'admin') {
                            groupRole = 'Admin';
                            roleEmoji = '⭐';
                        } else {
                            groupRole = 'Member';
                            roleEmoji = '👤';
                        }
                    }
                } catch (e) {}
            }

            const isBanned = userData?.isBanned || false;
            const isPremium = userData?.isPremium || false;
            const commandsUsed = userData?.commandsUsed || 0;
            const warnings = userData?.warnings || 0;
            const level = userData?.level || 1;
            const experience = userData?.experience || 0;

            await loadFonts();

            try {
                const canvas = createCanvas(800, 600);
                const ctx = canvas.getContext('2d');

                const gradient = ctx.createLinearGradient(0, 0, 800, 600);
                gradient.addColorStop(0, '#667eea');
                gradient.addColorStop(1, '#764ba2');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 800, 600);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(30, 30, 740, 540);

                if (profilePic) {
                    try {
                        const ppImage = await loadImage(profilePic);
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(130, 130, 80, 0, Math.PI * 2);
                        ctx.closePath();
                        ctx.clip();
                        ctx.drawImage(ppImage, 50, 50, 160, 160);
                        ctx.restore();
                        
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 5;
                        ctx.beginPath();
                        ctx.arc(130, 130, 80, 0, Math.PI * 2);
                        ctx.stroke();
                    } catch (e) {}
                }

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 36px Primary, Arial';
                ctx.fillText(userName.substring(0, 20), 240, 100);

                ctx.font = '24px Secondary, Arial';
                ctx.fillStyle = '#f0f0f0';
                ctx.fillText(`+${phone}`, 240, 140);

                ctx.fillText(`${statusEmoji} ${onlineStatus}`, 240, 180);

                let yPos = 260;

                ctx.font = 'bold 28px Primary, Arial';
                ctx.fillStyle = '#ffffff';
                ctx.fillText('📊 Statistics', 50, yPos);
                yPos += 50;

                ctx.font = '22px Secondary, Arial';
                ctx.fillStyle = '#f0f0f0';

                if (isGroup) {
                    ctx.fillText(`${roleEmoji} Role: ${groupRole}`, 50, yPos);
                    yPos += 35;
                    ctx.fillText(`💬 Messages: ${messageCount}`, 50, yPos);
                    yPos += 35;
                    ctx.fillText(`🗑️ Deleted: ${deletedCount}`, 50, yPos);
                    yPos += 35;
                    ctx.fillText(`📅 Joined: ${joinDate}`, 50, yPos);
                    yPos += 45;
                }

                ctx.fillText(`⚡ Commands Used: ${commandsUsed}`, 50, yPos);
                yPos += 35;
                ctx.fillText(`🎯 Level: ${level}`, 50, yPos);
                yPos += 35;
                ctx.fillText(`✨ XP: ${experience}`, 50, yPos);
                yPos += 35;
                ctx.fillText(`⚠️ Warnings: ${warnings}`, 50, yPos);

                if (isPremium) {
                    ctx.fillStyle = '#ffd700';
                    ctx.font = 'bold 26px Primary, Arial';
                    ctx.fillText('⭐ PREMIUM USER', 450, 300);
                }

                if (isBanned) {
                    ctx.fillStyle = '#ff4444';
                    ctx.font = 'bold 26px Primary, Arial';
                    ctx.fillText('🚫 BANNED', 450, 340);
                }

                ctx.font = '18px Secondary, Arial';
                ctx.fillStyle = '#dddddd';
                ctx.fillText(`📝 Bio: ${bio}`, 50, 560);

                const buffer = canvas.toBuffer('image/png');

                await sock.sendMessage(from, {
                    image: buffer,
                    caption: `👤 *${userName}*\n${statusEmoji} ${onlineStatus}\n\n${config.botName} Profile Card`,
                    mentions: targetSender !== sender ? [targetSender] : []
                }, { quoted: message });

            } catch (canvasError) {
                let profileText = `╔═════════════════════════════╗\n`;
                profileText += `║   👤 USER PROFILE CARD   \n`;
                profileText += `╚═════════════════════════════╝\n\n`;
                
                profileText += `📛 Name: ${userName}\n`;
                profileText += `📱 Phone: +${phone}\n`;
                profileText += `🆔 Status: ${statusEmoji} ${onlineStatus}\n`;
                profileText += `📝 Bio: ${bio}\n\n`;

                if (isGroup) {
                    profileText += `┌──────────────────────────┐\n`;
                    profileText += `│   👥 GROUP STATS   \n`;
                    profileText += `└──────────────────────────┘\n`;
                    profileText += `🎭 Role: ${roleEmoji} ${groupRole}\n`;
                    profileText += `💬 Messages: ${messageCount}\n`;
                    profileText += `🗑️ Deleted: ${deletedCount}\n`;
                    profileText += `📅 Joined: ${joinDate}\n\n`;
                }

                profileText += `┌──────────────────────────┐\n`;
                profileText += `│   🤖 BOT STATS   \n`;
                profileText += `└──────────────────────────┘\n`;
                profileText += `⚡ Commands: ${commandsUsed}\n`;
                profileText += `🎯 Level: ${level}\n`;
                profileText += `✨ XP: ${experience}\n`;
                profileText += `⚠️ Warnings: ${warnings}\n`;
                if (isPremium) profileText += `⭐ Premium User\n`;
                if (isBanned) profileText += `🚫 Banned\n`;

                await sock.sendMessage(from, {
                    text: profileText,
                    mentions: targetSender !== sender ? [targetSender] : []
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Profile command error:', error);
            await sock.sendMessage(from, {
                text: `❌ Failed to load profile\n\n⚠️ ${error.message}`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};

export function trackMessage(sender, from, isDeleted = false) {
    const msgKey = `${sender}_${from}`;
    
    if (!userMessageCounts.has(msgKey)) {
        userMessageCounts.set(msgKey, 0);
        userJoinDates.set(msgKey, Date.now());
    }
    
    if (isDeleted) {
        const current = userDeletedCounts.get(msgKey) || 0;
        userDeletedCounts.set(msgKey, current + 1);
    } else {
        const current = userMessageCounts.get(msgKey) || 0;
        userMessageCounts.set(msgKey, current + 1);
    }
}

export function getMessageCount(sender, from) {
    return userMessageCounts.get(`${sender}_${from}`) || 0;
}

export function getDeletedCount(sender, from) {
    return userDeletedCounts.get(`${sender}_${from}`) || 0;
}

export function clearUserStats(sender, from) {
    const msgKey = `${sender}_${from}`;
    userMessageCounts.delete(msgKey);
    userDeletedCounts.delete(msgKey);
    userJoinDates.delete(msgKey);
}
