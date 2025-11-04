import config from '../../config.js';
import Settings from '../../models/Settings.js';

let autoViewStatusEnabled = false;

async function handleStatusView(sock, update) {
    if (!autoViewStatusEnabled) return;
    
    try {
        const messages = update.messages;
        
        if (!messages || messages.length === 0) return;
        
        for (const message of messages) {
            const isStatus = message.key?.remoteJid === 'status@broadcast';
            
            if (isStatus && message.key?.id) {
                try {
                    await sock.readMessages([message.key]);
                    
                    console.log('Auto viewed status from:', message.key.participant || 'Unknown');
                } catch (err) {
                    console.error('Error viewing individual status:', err);
                }
            }
        }
    } catch (error) {
        console.error('Error in auto view status handler:', error);
    }
}

export default {
    name: 'autoviewstatus',
    aliases: ['autoview', 'viewstatus', 'avs'],
    category: 'owner',
    description: 'Toggle automatic WhatsApp status viewing',
    usage: 'autoviewstatus <on/off>',
    example: 'autoviewstatus on\nautoviewstatus off',
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
                let autoViewSetting;
                
                try {
                    autoViewSetting = await Settings.findOne({ key: 'autoViewStatus' });
                } catch (dbError) {
                    autoViewSetting = null;
                }

                const autoViewStatus = autoViewSetting?.value === 'true' || autoViewStatusEnabled;

                const statusText = `╭──⦿【 👁️ AUTO VIEW STATUS 】
│
│ 📊 𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗦𝘁𝗮𝘁𝘂𝘀:
│ ✧ Auto View Status: ${autoViewStatus ? '🟢 ON' : '🔴 OFF'}
│
│ 💡 𝗨𝘀𝗮𝗴𝗲:
│ ✧ ${prefix}autoviewstatus on
│ ✧ ${prefix}autoviewstatus off
│ ✧ ${prefix}autoviewstatus
│
│ 📝 𝗙𝗲𝗮𝘁𝘂𝗿𝗲:
│ Automatically views all WhatsApp
│ statuses from your contacts
│ Works in real-time as they post
│
╰────────────⦿

💫 | [ ${config.botName} 🍀 ]`;

                await sock.sendMessage(from, { text: statusText }, { quoted: message });
                return;
            }

            const action = args[0]?.toLowerCase();

            if (action === 'on') {
                autoViewStatusEnabled = true;

                try {
                    await Settings.findOneAndUpdate(
                        { key: 'autoViewStatus' },
                        { key: 'autoViewStatus', value: 'true' },
                        { upsert: true, new: true }
                    );
                } catch (dbError) {
                    console.log('Database not available, using memory mode');
                }

                if (!global.statusViewHandler) {
                    global.statusViewHandler = (update) => handleStatusView(sock, update);
                    sock.ev.on('messages.upsert', global.statusViewHandler);
                }

                const responseText = `╭──⦿【 ✅ AUTO VIEW STATUS ENABLED 】
│
│ 👁️ 𝗦𝘁𝗮𝘁𝘂𝘀: Activated
│ 👤 𝗘𝗻𝗮𝗯𝗹𝗲𝗱 𝗕𝘆: @${sender.split('@')[0]}
│ 🕐 𝗧𝗶𝗺𝗲: ${new Date().toLocaleString()}
│
│ ✨ 𝗙𝗲𝗮𝘁𝘂𝗿𝗲𝘀:
│ ✧ Automatically views all statuses
│ ✧ Works in real-time
│ ✧ Views from all contacts
│ ✧ No manual viewing needed
│
│ 💡 𝗡𝗼𝘁𝗲:
│ Bot will auto-view every status
│ posted by your contacts
│ Setting persists after restart
│
╰────────────⦿

💫 | [ ${config.botName} 🍀 ]`;

                await sock.sendMessage(from, {
                    text: responseText,
                    mentions: [sender]
                }, { quoted: message });

            } else if (action === 'off') {
                autoViewStatusEnabled = false;

                try {
                    await Settings.findOneAndUpdate(
                        { key: 'autoViewStatus' },
                        { key: 'autoViewStatus', value: 'false' },
                        { upsert: true, new: true }
                    );
                } catch (dbError) {
                    console.log('Database not available, using memory mode');
                }

                if (global.statusViewHandler) {
                    sock.ev.off('messages.upsert', global.statusViewHandler);
                    global.statusViewHandler = null;
                }

                const responseText = `╭──⦿【 ❌ AUTO VIEW STATUS DISABLED 】
│
│ 👁️ 𝗦𝘁𝗮𝘁𝘂𝘀: Deactivated
│ 👤 𝗗𝗶𝘀𝗮𝗯𝗹𝗲𝗱 𝗕𝘆: @${sender.split('@')[0]}
│ 🕐 𝗧𝗶𝗺𝗲: ${new Date().toLocaleString()}
│
│ 💡 𝗡𝗼𝘁𝗲:
│ Bot will no longer automatically
│ view WhatsApp statuses
│ Manual viewing only from now on
│
╰────────────⦿

💫 | [ ${config.botName} 🍀 ]`;

                await sock.sendMessage(from, {
                    text: responseText,
                    mentions: [sender]
                }, { quoted: message });

            } else {
                await sock.sendMessage(from, {
                    text: `❌ *Invalid Action*\n\nValid actions:\n• on - Enable auto view status\n• off - Disable auto view status\n\nExamples:\n• ${prefix}autoviewstatus on\n• ${prefix}autoviewstatus off\n• ${prefix}autoviewstatus (check status)`
                }, { quoted: message });
            }

        } catch (error) {
            console.error('AutoViewStatus command error:', error);

            await sock.sendMessage(from, {
                text: `❌ *Error*\n\nFailed to toggle auto view status.\n\n*Error:* ${error.message}\n\nPlease try again.`
            }, { quoted: message });
        }
    }
};

if (global.sock) {
    (async () => {
        try {
            const autoViewSetting = await Settings.findOne({ key: 'autoViewStatus' });

            if (autoViewSetting?.value === 'true') {
                autoViewStatusEnabled = true;
                if (!global.statusViewHandler) {
                    global.statusViewHandler = (update) => handleStatusView(global.sock, update);
                    global.sock.ev.on('messages.upsert', global.statusViewHandler);
                    console.log('Auto view status mode restored from settings');
                }
            }
        } catch (error) {
            console.log('Settings not loaded, using defaults');
        }
    })();
}