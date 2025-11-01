import config from '../../config.js';
import { createCanvas } from '@napi-rs/canvas';

export default {
    name: 'license',
    aliases: ['licence', 'copyright', 'legal'],
    category: 'general',
    description: 'View bot license and legal information',
    usage: 'license',
    example: 'license',
    cooldown: 5,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: false,
    supportsButtons: false,

    async execute({ sock, message, from, sender }) {
        try {
            const canvas = createCanvas(1200, 900);
            const ctx = canvas.getContext('2d');

            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#2c3e50');
            gradient.addColorStop(0.5, '#34495e');
            gradient.addColorStop(1, '#2c3e50');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = 'bold 70px Arial';
            ctx.fillStyle = '#ecf0f1';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 10;
            ctx.fillText('📜 SOFTWARE LICENSE', canvas.width / 2, 100);

            ctx.shadowBlur = 0;

            const boxY = 150;
            const boxWidth = 1000;
            const boxHeight = 680;
            const boxX = (canvas.width - boxWidth) / 2;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 20);
            ctx.fill();

            ctx.font = 'bold 40px Arial';
            ctx.fillStyle = '#3498db';
            ctx.textAlign = 'left';
            ctx.fillText('MIT License', boxX + 40, boxY + 60);

            ctx.font = '28px Arial';
            ctx.fillStyle = '#ecf0f1';
            ctx.fillText(`Copyright © ${new Date().getFullYear()} ${config.ownerName}`, boxX + 40, boxY + 110);

            ctx.font = '24px Arial';
            ctx.fillStyle = '#bdc3c7';
            const licenseText = [
                'Permission is hereby granted, free of charge, to any',
                'person obtaining a copy of this software and associated',
                'documentation files (the "Software"), to deal in the',
                'Software without restriction, including without limitation',
                'the rights to use, copy, modify, merge, publish,',
                'distribute, sublicense, and/or sell copies of the',
                'Software, and to permit persons to whom the Software',
                'is furnished to do so, subject to the following',
                'conditions:'
            ];

            let yPos = boxY + 160;
            licenseText.forEach(line => {
                ctx.fillText(line, boxX + 40, yPos);
                yPos += 35;
            });

            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.roundRect(ctx, boxX + 20, boxY + 510, boxWidth - 40, 140, 15);
            ctx.fill();

            ctx.font = 'bold 26px Arial';
            ctx.fillStyle = '#e74c3c';
            ctx.fillText('WARRANTY DISCLAIMER', boxX + 40, boxY + 550);

            ctx.font = '20px Arial';
            ctx.fillStyle = '#ecf0f1';
            const disclaimer = [
                'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,',
                'EXPRESS OR IMPLIED. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR',
                'ANY CLAIM, DAMAGES OR OTHER LIABILITY ARISING FROM THE SOFTWARE.'
            ];

            yPos = boxY + 585;
            disclaimer.forEach(line => {
                ctx.fillText(line, boxX + 40, yPos);
                yPos += 30;
            });

            ctx.font = '24px Arial';
            ctx.fillStyle = '#95a5a6';
            ctx.textAlign = 'center';
            ctx.fillText(`${config.botName} v${config.botVersion} | Built by ${config.ownerName}`, canvas.width / 2, canvas.height - 50);

            const buffer = canvas.toBuffer('image/png');

            const licenseInfo = `╭──⦿【 📜 SOFTWARE LICENSE 】
│
│ 📄 𝗟𝗶𝗰𝗲𝗻𝘀𝗲: MIT License
│ 👨‍💻 𝗔𝘂𝘁𝗵𝗼𝗿: ${config.ownerName}
│ 🤖 𝗦𝗼𝗳𝘁𝘄𝗮𝗿𝗲: ${config.botName}
│ 📌 𝗩𝗲𝗿𝘀𝗶𝗼𝗻: ${config.botVersion}
│ ©️ 𝗖𝗼𝗽𝘆𝗿𝗶𝗴𝗵𝘁: ${new Date().getFullYear()}
│
╰────────────⦿

╭──⦿【 ⚖️ LICENSE TERMS 】
│
│ ✅ 𝗣𝗲𝗿𝗺𝗶𝘀𝘀𝗶𝗼𝗻𝘀:
│ ✧ Commercial use
│ ✧ Modification
│ ✧ Distribution
│ ✧ Private use
│
│ 📋 𝗖𝗼𝗻𝗱𝗶𝘁𝗶𝗼𝗻𝘀:
│ ✧ License and copyright notice
│ ✧ Document changes made
│ ✧ State software modifications
│
│ ⚠️ 𝗟𝗶𝗺𝗶𝘁𝗮𝘁𝗶𝗼𝗻𝘀:
│ ✧ No warranty provided
│ ✧ No liability assumed
│ ✧ Use at own risk
│
╰────────────⦿

╭──⦿【 📞 CONTACT 】
│
│ 🌐 𝗪𝗲𝗯𝘀𝗶𝘁𝗲: ${config.botWebsite || 'https://ilom.tech'}
│ 📦 𝗥𝗲𝗽𝗼𝘀𝗶𝘁𝗼𝗿𝘆: ${config.botRepository || 'GitHub'}
│ 📧 𝗦𝘂𝗽𝗽𝗼𝗿𝘁: Contact owner
│
╰────────────⦿

╭──⦿【 ℹ️ FULL LICENSE TEXT 】
│
│ MIT License
│
│ Copyright (c) ${new Date().getFullYear()} ${config.ownerName}
│
│ Permission is hereby granted, free of charge,
│ to any person obtaining a copy of this software
│ and associated documentation files (the "Software"),
│ to deal in the Software without restriction,
│ including without limitation the rights to use,
│ copy, modify, merge, publish, distribute, sublicense,
│ and/or sell copies of the Software, and to permit
│ persons to whom the Software is furnished to do so,
│ subject to the following conditions:
│
│ The above copyright notice and this permission
│ notice shall be included in all copies or
│ substantial portions of the Software.
│
│ THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY
│ OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
│ LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
│ FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
│ IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
│ BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
│ WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
│ ARISING FROM, OUT OF OR IN CONNECTION WITH THE
│ SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
│
╰────────────⦿

╭─────────────⦿
│💫 | [ ${config.botName} 🍀 ]
│ Licensed under MIT License
│ Free and Open Source Software
╰────────────⦿`;

            await sock.sendMessage(from, {
                image: buffer,
                caption: licenseInfo,
                mentions: [sender]
            }, { quoted: message });

        } catch (error) {
            console.error('License command error:', error);

            const fallbackText = `╭──⦿【 📜 SOFTWARE LICENSE 】
│
│ 📄 𝗟𝗶𝗰𝗲𝗻𝘀𝗲: MIT License
│ 👨‍💻 𝗔𝘂𝘁𝗵𝗼𝗿: ${config.ownerName}
│ 🤖 𝗦𝗼𝗳𝘁𝘄𝗮𝗿𝗲: ${config.botName}
│ 📌 𝗩𝗲𝗿𝘀𝗶𝗼𝗻: ${config.botVersion}
│ ©️ 𝗖𝗼𝗽𝘆𝗿𝗶𝗴𝗵𝘁: ${new Date().getFullYear()}
│
╰────────────⦿

╭──⦿【 ⚖️ MIT LICENSE 】
│
│ Permission is hereby granted, free of charge,
│ to any person obtaining a copy of this software
│ and associated documentation files, to deal in
│ the Software without restriction, including
│ without limitation the rights to use, copy,
│ modify, merge, publish, distribute, sublicense,
│ and/or sell copies of the Software.
│
│ THE SOFTWARE IS PROVIDED "AS IS", WITHOUT
│ WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
│
╰────────────⦿

╭──⦿【 📞 CONTACT 】
│ 🌐 ${config.botWebsite || 'https://ilom.tech'}
│ 📦 ${config.botRepository || 'GitHub'}
╰────────────⦿

╭─────────────⦿
│💫 | [ ${config.botName} 🍀 ]
╰────────────⦿`;

            await sock.sendMessage(from, {
                text: fallbackText,
                mentions: [sender]
            }, { quoted: message });
        }
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