import { getUser, updateUser } from '../../models/User.js';
import config from '../../config.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs-extra';

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
            const phone = targetSender.replace('@s.whatsapp.net', '').replace('@lid', '');

            let profilePic = null;
            try {
                profilePic = await sock.profilePictureUrl(targetSender, 'image');
            } catch (e) {
                profilePic = null;
            }

            let onlineStatus = 'Offline';
            let statusEmoji = '🔴';
            let statusColor = '#ff4444';

            try {
                await sock.presenceSubscribe(targetSender);
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const presence = await sock.presenceSubscribe(targetSender);
                
                if (presence) {
                    const presenceData = presence[targetSender];
                    if (presenceData) {
                        const lastKnown = presenceData.lastKnownPresence;
                        
                        if (lastKnown === 'available') {
                            onlineStatus = 'Online';
                            statusEmoji = '🟢';
                            statusColor = '#44ff44';
                        } else if (lastKnown === 'composing') {
                            onlineStatus = 'Typing...';
                            statusEmoji = '💬';
                            statusColor = '#4444ff';
                        } else if (lastKnown === 'recording') {
                            onlineStatus = 'Recording...';
                            statusEmoji = '🎤';
                            statusColor = '#ff44ff';
                        } else if (presenceData.lastSeen) {
                            const lastSeenTime = new Date(presenceData.lastSeen * 1000);
                            const now = new Date();
                            const diffMs = now - lastSeenTime;
                            const diffMins = Math.floor(diffMs / 60000);
                            const diffHours = Math.floor(diffMins / 60);
                            const diffDays = Math.floor(diffHours / 24);

                            if (diffMins < 1) {
                                onlineStatus = 'Just now';
                                statusEmoji = '🟡';
                                statusColor = '#ffff44';
                            } else if (diffMins < 60) {
                                onlineStatus = `${diffMins}m ago`;
                                statusEmoji = '🟡';
                                statusColor = '#ffaa44';
                            } else if (diffHours < 24) {
                                onlineStatus = `${diffHours}h ago`;
                                statusEmoji = '🟠';
                                statusColor = '#ff8844';
                            } else {
                                onlineStatus = `${diffDays}d ago`;
                                statusEmoji = '🔴';
                                statusColor = '#ff4444';
                            }
                        }
                    }
                }
            } catch (e) {
                onlineStatus = 'Offline';
                statusEmoji = '🔴';
                statusColor = '#ff4444';
            }

            let bio = 'No bio set';
            try {
                const statusResponse = await sock.fetchStatus(targetSender);
                if (statusResponse?.status) {
                    bio = statusResponse.status.substring(0, 80);
                    if (statusResponse.status.length > 80) bio += '...';
                }
            } catch (e) {
                bio = 'No bio available';
            }

            let joinDate = userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            }) : 'Unknown';

            let groupRole = 'Member';
            let roleEmoji = '👤';
            let roleColor = '#888888';

            if (isGroup) {
                try {
                    const groupMetadata = await sock.groupMetadata(from);
                    const participant = groupMetadata.participants.find(p => {
                        const pId = p.id.split('@')[0];
                        const targetId = targetSender.split('@')[0];
                        return pId === targetId;
                    });
                    
                    if (participant) {
                        if (participant.admin === 'superadmin') {
                            groupRole = 'Owner';
                            roleEmoji = '👑';
                            roleColor = '#ffd700';
                        } else if (participant.admin === 'admin') {
                            groupRole = 'Admin';
                            roleEmoji = '⭐';
                            roleColor = '#4a9eff';
                        } else {
                            groupRole = 'Member';
                            roleEmoji = '👤';
                            roleColor = '#888888';
                        }
                    }
                } catch (e) {
                    console.error('Group metadata error:', e);
                }
            }

            const isBanned = userData?.banned || false;
            const isPremium = userData?.isPremium || false;
            const commandsUsed = userData?.commandsUsed || 0;
            const warnings = userData?.warnings || 0;
            const messageCount = userData?.messageCount || 0;
            const level = Math.floor((userData?.xp || 0) / 1000) + 1;
            const experience = userData?.xp || 0;
            const xpToNext = (level * 1000) - experience;
            const xpProgress = ((experience % 1000) / 1000) * 100;

            try {
                const canvas = createCanvas(900, 700);
                const ctx = canvas.getContext('2d');

                const bgGradient = ctx.createLinearGradient(0, 0, 900, 700);
                bgGradient.addColorStop(0, '#1a1a2e');
                bgGradient.addColorStop(0.5, '#16213e');
                bgGradient.addColorStop(1, '#0f3460');
                ctx.fillStyle = bgGradient;
                ctx.fillRect(0, 0, 900, 700);

                for (let i = 0; i < 100; i++) {
                    const x = Math.random() * 900;
                    const y = Math.random() * 700;
                    const size = Math.random() * 2;
                    const opacity = Math.random() * 0.8;
                    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                this.roundRect(ctx, 40, 40, 820, 620, 30);
                ctx.fill();

                ctx.strokeStyle = 'rgba(138, 43, 226, 0.3)';
                ctx.lineWidth = 2;
                ctx.stroke();

                if (profilePic) {
                    try {
                        const ppImage = await loadImage(profilePic);
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(150, 150, 90, 0, Math.PI * 2);
                        ctx.closePath();
                        ctx.clip();
                        ctx.drawImage(ppImage, 60, 60, 180, 180);
                        ctx.restore();
                        
                        const ringGradient = ctx.createLinearGradient(60, 60, 240, 240);
                        ringGradient.addColorStop(0, '#667eea');
                        ringGradient.addColorStop(1, '#764ba2');
                        ctx.strokeStyle = ringGradient;
                        ctx.lineWidth = 6;
                        ctx.beginPath();
                        ctx.arc(150, 150, 93, 0, Math.PI * 2);
                        ctx.stroke();

                        ctx.fillStyle = statusColor;
                        ctx.beginPath();
                        ctx.arc(220, 220, 20, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = '#1a1a2e';
                        ctx.lineWidth = 4;
                        ctx.stroke();
                    } catch (e) {
                        console.error('Profile pic error:', e);
                    }
                }

                ctx.font = 'bold 48px Arial';
                const nameGradient = ctx.createLinearGradient(280, 100, 800, 100);
                nameGradient.addColorStop(0, '#ffffff');
                nameGradient.addColorStop(1, '#a8a8ff');
                ctx.fillStyle = nameGradient;
                const displayName = userName.length > 15 ? userName.substring(0, 15) + '...' : userName;
                ctx.fillText(displayName, 280, 110);

                ctx.font = '28px Arial';
                ctx.fillStyle = '#b8b8b8';
                ctx.fillText(`+${phone}`, 280, 155);

                ctx.font = 'bold 26px Arial';
                ctx.fillStyle = statusColor;
                ctx.fillText(`${statusEmoji} ${onlineStatus}`, 280, 195);

                if (isGroup) {
                    ctx.font = 'bold 24px Arial';
                    ctx.fillStyle = roleColor;
                    ctx.fillText(`${roleEmoji} ${groupRole}`, 280, 230);
                }

                let yPos = 290;

                this.drawInfoCard(ctx, 60, yPos, 380, 340, {
                    title: '📊 ACTIVITY STATS',
                    items: [
                        { icon: '💬', label: 'Messages', value: messageCount.toString() },
                        { icon: '⚡', label: 'Commands', value: commandsUsed.toString() },
                        { icon: '🎯', label: 'Level', value: level.toString() },
                        { icon: '✨', label: 'Experience', value: experience.toString() },
                        { icon: '⚠️', label: 'Warnings', value: warnings.toString() },
                        { icon: '📅', label: 'Joined', value: joinDate }
                    ]
                });

                this.drawInfoCard(ctx, 480, yPos, 380, 340, {
                    title: '🏆 ACHIEVEMENTS',
                    items: [
                        { icon: isPremium ? '⭐' : '❌', label: 'Premium', value: isPremium ? 'Active' : 'Inactive' },
                        { icon: isBanned ? '🚫' : '✅', label: 'Status', value: isBanned ? 'Banned' : 'Active' },
                        { icon: '🔥', label: 'Streak', value: '0 days' },
                        { icon: '🎖️', label: 'Rank', value: level > 10 ? 'Expert' : level > 5 ? 'Advanced' : 'Beginner' }
                    ]
                });

                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                this.roundRect(ctx, 60, 640, 800, 50, 15);
                ctx.fill();

                ctx.font = '22px Arial';
                ctx.fillStyle = '#e0e0e0';
                const bioDisplay = bio.length > 60 ? bio.substring(0, 60) + '...' : bio;
                ctx.fillText(`📝 ${bioDisplay}`, 80, 672);

                const progressBarY = 270;
                const progressBarWidth = 520;
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                this.roundRect(ctx, 280, progressBarY, progressBarWidth, 20, 10);
                ctx.fill();

                const filledWidth = (xpProgress / 100) * progressBarWidth;
                const progressGradient = ctx.createLinearGradient(280, progressBarY, 280 + filledWidth, progressBarY);
                progressGradient.addColorStop(0, '#667eea');
                progressGradient.addColorStop(1, '#764ba2');
                ctx.fillStyle = progressGradient;
                this.roundRect(ctx, 280, progressBarY, filledWidth, 20, 10);
                ctx.fill();

                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.fillText(`${xpToNext} XP to Level ${level + 1}`, 540, 285);
                ctx.textAlign = 'left';

                const buffer = canvas.toBuffer('image/png');

                await sock.sendMessage(from, {
                    image: buffer,
                    caption: `👤 Profile Card Generated\n\n` +
                             `Name: ${userName}\n` +
                             `Status: ${statusEmoji} ${onlineStatus}\n` +
                             `Level: ${level} | XP: ${experience}\n\n` +
                             `Powered by ${config.botName || 'WhatsApp Bot'}`,
                    mentions: targetSender !== sender ? [targetSender] : []
                }, { quoted: message });

            } catch (canvasError) {
                console.error('Canvas error:', canvasError);

                let profileText = `📋 USER PROFILE\n\n`;
                profileText += `👤 Name: ${userName}\n`;
                profileText += `📱 Phone: +${phone}\n`;
                profileText += `🆔 Status: ${statusEmoji} ${onlineStatus}\n`;
                profileText += `📝 Bio: ${bio}\n\n`;

                if (isGroup) {
                    profileText += `👥 GROUP INFO\n`;
                    profileText += `🎭 Role: ${roleEmoji} ${groupRole}\n`;
                    profileText += `💬 Messages: ${messageCount}\n`;
                    profileText += `📅 Joined: ${joinDate}\n\n`;
                }

                profileText += `📊 STATISTICS\n`;
                profileText += `⚡ Commands: ${commandsUsed}\n`;
                profileText += `🎯 Level: ${level}\n`;
                profileText += `✨ XP: ${experience}\n`;
                profileText += `⚠️ Warnings: ${warnings}\n`;
                if (isPremium) profileText += `⭐ Premium User\n`;
                if (isBanned) profileText += `🚫 Banned User\n`;

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
    },

    drawInfoCard(ctx, x, y, width, height, config) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        this.roundRect(ctx, x, y, width, height, 20);
        ctx.fill();

        ctx.strokeStyle = 'rgba(138, 43, 226, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(config.title, x + 20, y + 40);

        const itemStartY = y + 80;
        const itemHeight = 40;

        config.items.forEach((item, index) => {
            const itemY = itemStartY + (index * itemHeight);

            ctx.font = '22px Arial';
            ctx.fillStyle = '#b8b8b8';
            ctx.fillText(`${item.icon} ${item.label}:`, x + 20, itemY);

            ctx.font = 'bold 22px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'right';
            ctx.fillText(item.value, x + width - 20, itemY);
            ctx.textAlign = 'left';
        });
    },

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
};

export async function trackMessage(sender, from, isDeleted = false) {
    try {
        const userData = await getUser(sender);
        if (userData) {
            await updateUser(sender, {
                $inc: { messageCount: isDeleted ? 0 : 1 },
                $set: { lastSeen: new Date() }
            });
        }
    } catch (error) {
        console.error('Error tracking message:', error);
    }
}

export async function getMessageCount(sender, from) {
    try {
        const userData = await getUser(sender);
        return userData?.messageCount || 0;
    } catch {
        return 0;
    }
}

export async function getDeletedCount(sender, from) {
    return 0;
}

export async function clearUserStats(sender, from) {
    try {
        await updateUser(sender, {
            $set: {
                messageCount: 0,
                commandsUsed: 0
            }
        });
    } catch (error) {
        console.error('Error clearing stats:', error);
    }
}