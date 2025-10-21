import config from '../../config.js';
import constants from '../../constants.js';
import moment from 'moment';

export default {
    name: 'ping',
    aliases: ['p', 'latency', 'speed'],
    category: 'general',
    description: 'Check bot response time and status',
    usage: 'ping',
    example: 'ping',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, from, isGroup }) {
        const start = Date.now();
        
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        
        const memoryUsage = process.memoryUsage();
        const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        
        const latency = Date.now() - start;
        const speedStatus = latency < 100 ? '⚡ Ultra Fast' : latency < 300 ? '🚀 Fast' : '📡 Normal';
        
        const response = `╭━━━⦿【 🏓 PING STATUS 】⦿━━━╮
│
│  ⚡ 𝗦𝗽𝗲𝗲𝗱: ${latency}ms
│  📊 𝗦𝘁𝗮𝘁𝘂𝘀: ${speedStatus}
│  ⏰ 𝗨𝗽𝘁𝗶𝗺𝗲: ${hours}h ${minutes}m
│  🧠 𝗠𝗲𝗺𝗼𝗿𝘆: ${memoryMB}MB
│  🤖 𝗕𝗼𝘁: ${config.botName}
│  🔄 𝗠𝗼𝗱𝗲: ${config.publicMode ? 'PUBLIC 🌐' : 'PRIVATE 🔐'}
│  ⏱️ 𝗧𝗶𝗺𝗲: ${moment().format('HH:mm:ss')}
│  🌍 𝗖𝗵𝗮𝘁: ${isGroup ? 'Group 👥' : 'Private 💬'}
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

💫 ${config.botName} is running smoothly!`;

        await sock.sendMessage(from, {
            text: response
        }, { quoted: message });
    }
};