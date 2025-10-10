import { exec } from 'child_process';
import util from 'util';
import formatResponse from '../../utils/formatUtils.js';

const execPromise = util.promisify(exec);

export default {
    name: 'shell',
    aliases: ['sh', 'bash', 'terminal', '$'],
    category: 'owner',
    description: 'Execute shell commands directly in the terminal',
    usage: 'shell <command>',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        const command = args.join(' ');
        
        const dangerousCommands = [
            'rm -rf /', 'rm -rf *', 'rm -rf ~',
            'mkfs', 'dd if=/dev/zero', ':(){:|:&};:',
            'fork', '>()', 'shutdown', 'reboot',
            'init 0', 'init 6', 'halt', 'poweroff'
        ];
        
        const isDangerous = dangerousCommands.some(cmd => 
            command.toLowerCase().includes(cmd.toLowerCase())
        );
        
        if (isDangerous) {
            return sock.sendMessage(from, {
                text: formatResponse.error('DANGEROUS COMMAND',
                    `This command could harm the system`,
                    `Use safe commands only. Dangerous operations are blocked for security.`)
            }, { quoted: message });
        }

        await sock.sendMessage(from, {
            text: `╭──⦿【 ⚙️ SHELL EXECUTION 】
│
│ 📝 Executing command...
│ \`${command}\`
│
│ ⏳ Please wait...
│
╰────────────⦿`
        }, { quoted: message });

        try {
            const startTime = Date.now();
            const { stdout, stderr } = await execPromise(command, {
                timeout: 60000,
                maxBuffer: 1024 * 1024 * 10,
                cwd: process.cwd(),
                shell: '/bin/bash'
            });
            const executionTime = Date.now() - startTime;

            const output = stdout || stderr || 'Command executed (no output)';
            const truncated = output.length > 3500 
                ? output.substring(0, 3500) + '\n\n...[Output truncated]' 
                : output;

            await sock.sendMessage(from, {
                text: `╭──⦿【 ✅ SHELL SUCCESS 】
│
│ 📝 𝗖𝗼𝗺𝗺𝗮𝗻𝗱:
│ \`${command}\`
│
│ 📤 𝗢𝘂𝘁𝗽𝘂𝘁:
│ \`\`\`
${truncated}
\`\`\`
│
│ ⏱️ 𝗘𝘅𝗲𝗰𝘂𝘁𝗶𝗼𝗻: ${executionTime}ms
│ 📅 𝗧𝗶𝗺𝗲: ${new Date().toLocaleTimeString()}
│
╰────────────⦿`
            }, { quoted: message });

        } catch (error) {
            const errorOutput = error.stdout || error.stderr || error.message;
            const truncated = errorOutput.length > 3000 
                ? errorOutput.substring(0, 3000) + '\n\n...[Error truncated]' 
                : errorOutput;

            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ SHELL ERROR 】
│
│ 📝 𝗖𝗼𝗺𝗺𝗮𝗻𝗱:
│ \`${command}\`
│
│ ⚠️ 𝗘𝗿𝗿𝗼𝗿:
│ \`\`\`
${truncated}
\`\`\`
│
│ 🔴 𝗘𝘅𝗶𝘁 𝗖𝗼𝗱𝗲: ${error.code || 'Unknown'}
│
╰────────────⦿`
            }, { quoted: message });
        }
    }
};
