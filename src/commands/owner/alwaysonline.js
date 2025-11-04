import config from '../../config.js';
import Settings from '../../models/Settings.js';

let onlineStatusInterval = null;

async function setOnlineStatus(sock) {
    try {
        if (sock && sock.user) {
            await sock.sendPresenceUpdate('available');
        }
    } catch (error) {
        console.error('Error setting online status:', error);
    }
}

async function startOnlineStatus(sock) {
    if (onlineStatusInterval) {
        clearInterval(onlineStatusInterval);
    }
    
    await setOnlineStatus(sock);
    
    onlineStatusInterval = setInterval(async () => {
        await setOnlineStatus(sock);
    }, 30000);
}

function stopOnlineStatus() {
    if (onlineStatusInterval) {
        clearInterval(onlineStatusInterval);
        onlineStatusInterval = null;
    }
}

export default {
    name: 'alwaysonline',
    aliases: ['ao', 'online', 'onlinestatus'],
    category: 'owner',
    description: 'Toggle always online status mode',
    usage: 'alwaysonline <on/off>',
    example: 'alwaysonline on\nalwaysonline off',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,
    args: false,
    minArgs: 0,
    maxArgs: 1,
    typing: true,
    premium: false,
    hidden: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: false,
    supportsButtons: false,

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            if (args.length === 0) {
                let alwaysOnlineSetting;
                
                try {
                    alwaysOnlineSetting = await Settings.findOne({ key: 'alwaysOnline' });
                } catch (dbError) {
                    alwaysOnlineSetting = null;
                }

                const alwaysOnlineStatus = alwaysOnlineSetting?.value === 'true' || onlineStatusInterval !== null;

                const statusText = `╭──⦿【 🌐 ALWAYS ONLINE 】
│
│ 📊 𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗦𝘁𝗮𝘁𝘂𝘀:
│ ✧ Always Online: ${alwaysOnlineStatus ? '🟢 ON' : '🔴 OFF'}
│
│ 💡 𝗨𝘀𝗮𝗴𝗲:
│ ✧ ${prefix}alwaysonline on
│ ✧ ${prefix}alwaysonline off
│ ✧ ${prefix}alwaysonline
│
│ 📝 𝗙𝗲𝗮𝘁𝘂𝗿𝗲:
│ Bot will appear online 24/7
│ Status updates every 30 seconds
│ Presence always shows as available
│
╰────────────⦿

💫 | [ ${config.botName} 🍀 ]`;

                await sock.sendMessage(from, { text: statusText }, { quoted: message });
                return;
            }

            const action = args[0]?.toLowerCase();

            if (action === 'on') {
                startOnlineStatus(sock);
                
                try {
                    await Settings.findOneAndUpdate(
                        { key: 'alwaysOnline' },
                        { key: 'alwaysOnline', value: 'true' },
                        { upsert: true, new: true }
                    );
                } catch (dbError) {
                    console.log('Database not available, using memory mode');
                }

                config.autoOnline = true;

                const responseText = `╭──⦿【 ✅ ALWAYS ONLINE ENABLED 】
│
│ 🟢 𝗦𝘁𝗮𝘁𝘂𝘀: Activated
│ 👤 𝗘𝗻𝗮𝗯𝗹𝗲𝗱 𝗕𝘆: @${sender.split('@')[0]}
│ 🕐 𝗧𝗶𝗺𝗲: ${new Date().toLocaleString()}
│
│ ✨ 𝗙𝗲𝗮𝘁𝘂𝗿𝗲𝘀:
│ ✧ Bot appears online 24/7
│ ✧ Updates every 30 seconds
│ ✧ Always shows available status
│ ✧ Automatic presence management
│
│ 💡 𝗡𝗼𝘁𝗲:
│ Setting persists after restart
│
╰────────────⦿

💫 | [ ${config.botName} 🍀 ]`;

                await sock.sendMessage(from, {
                    text: responseText,
                    mentions: [sender]
                }, { quoted: message });

            } else if (action === 'off') {
                stopOnlineStatus();
                
                try {
                    await Settings.findOneAndUpdate(
                        { key: 'alwaysOnline' },
                        { key: 'alwaysOnline', value: 'false' },
                        { upsert: true, new: true }
                    );
                } catch (dbError) {
                    console.log('Database not available, using memory mode');
                }

                config.autoOnline = false;

                try {
                    await sock.sendPresenceUpdate('unavailable');
                } catch (err) {
                    console.error('Error setting unavailable:', err);
                }

                const responseText = `╭──⦿【 ❌ ALWAYS ONLINE DISABLED 】
│
│ 🔴 𝗦𝘁𝗮𝘁𝘂𝘀: Deactivated
│ 👤 𝗗𝗶𝘀𝗮𝗯𝗹𝗲𝗱 𝗕𝘆: @${sender.split('@')[0]}
│ 🕐 𝗧𝗶𝗺𝗲: ${new Date().toLocaleString()}
│
│ 💡 𝗡𝗼𝘁𝗲:
│ Bot will now show normal status
│ Based on actual activity
│ Presence updates naturally
│
╰────────────⦿

💫 | [ ${config.botName} 🍀 ]`;

                await sock.sendMessage(from, {
                    text: responseText,
                    mentions: [sender]
                }, { quoted: message });

            } else {
                await sock.sendMessage(from, {
                    text: `❌ *Invalid Action*\n\nValid actions:\n• on - Enable always online\n• off - Disable always online\n\nExamples:\n• ${prefix}alwaysonline on\n• ${prefix}alwaysonline off\n• ${prefix}alwaysonline (check status)`
                }, { quoted: message });
            }

        } catch (error) {
            console.error('AlwaysOnline command error:', error);

            await sock.sendMessage(from, {
                text: `❌ *Error*\n\nFailed to toggle online status.\n\n*Error:* ${error.message}\n\nPlease try again.`
            }, { quoted: message });
        }
    }
};

if (global.sock) {
    (async () => {
        try {
            const onlineSetting = await Settings.findOne({ key: 'alwaysOnline' });

            if (onlineSetting?.value === 'true') {
                startOnlineStatus(global.sock);
                console.log('Always online mode restored from settings');
            }
        } catch (error) {
            console.log('Settings not loaded, using defaults');
        }
    })();
}