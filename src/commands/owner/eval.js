import config from '../../config.js';

export default {
    name: 'eval',
    aliases: ['e', 'evaluate'],
    category: 'owner',
    description: 'Execute JavaScript code (DANGEROUS - Owner Only)',
    usage: 'eval <code>',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            if (process.env.DISABLE_EVAL === 'true') {
                await sock.sendMessage(from, {
                    text: `🚫 *Eval Command Disabled*\n\nThe eval command has been disabled via environment configuration for security reasons.\n\nTo enable: Set DISABLE_EVAL=false in your environment variables.`
                }, { quoted: message });
                return;
            }

            const code = args.join(' ');
            
            const blockedPatterns = [
                /process\.env/i,
                /\.env/i,
                /apiKey/i,
                /secret/i,
                /token/i,
                /password/i,
                /require\s*\(\s*['"]fs['"]\s*\)/i,
                /require\s*\(\s*['"]child_process['"]\s*\)/i,
                /import\s+.*from\s+['"]fs['"]/i,
                /import\s+.*from\s+['"]child_process['"]/i
            ];
            
            const hasBlockedPattern = blockedPatterns.some(pattern => pattern.test(code));
            
            if (hasBlockedPattern) {
                await sock.sendMessage(from, {
                    text: `🚫 *Security Block*\n\n⚠️ The code contains potentially dangerous patterns:\n• Environment variable access\n• File system operations\n• Process manipulation\n• Sensitive data references\n\n*These operations are blocked for security.*\n\nUse dedicated commands for file/system operations instead.`
                }, { quoted: message });
                return;
            }
            
            await sock.sendMessage(from, {
                text: `⚠️ *SECURITY WARNING*\n\n🔴 **DANGER:** Executing arbitrary code\n📝 **Code:** \`${code.length > 100 ? code.substring(0, 100) + '...' : code}\`\n\n⏳ Executing...`
            }, { quoted: message });
            
            const startTime = Date.now();
            let result;
            let error = null;
            
            try {
                const asyncCode = `(async () => { ${code} })()`;
                result = await eval(asyncCode);
                
                if (typeof result === 'object') {
                    result = JSON.stringify(result, null, 2);
                } else {
                    result = String(result);
                }
                
                const sensitivePatterns = [
                    /sk-[a-zA-Z0-9]{20,}/g,
                    /api[_-]?key/gi,
                    /token/gi,
                    /password/gi
                ];
                
                sensitivePatterns.forEach(pattern => {
                    result = result.replace(pattern, '[REDACTED]');
                });
                
            } catch (evalError) {
                error = evalError;
                result = error.stack || error.message || 'Unknown error';
            }
            
            const executionTime = Date.now() - startTime;
            
            const response = `${error ? '❌' : '✅'} *Code Execution ${error ? 'Failed' : 'Complete'}*\n\n📝 **Code:**\n\`\`\`javascript\n${code}\n\`\`\`\n\n📤 **Result:**\n\`\`\`\n${result.length > 2000 ? result.substring(0, 2000) + '...[truncated]' : result}\n\`\`\`\n\n⏱️ **Execution Time:** ${executionTime}ms\n🔒 **Security Level:** MAXIMUM RISK\n\n${error ? '⚠️ *Error occurred during execution*' : '✅ *Execution completed successfully*'}`;
            
            await sock.sendMessage(from, { text: response }, { quoted: message });
            
        } catch (error) {
            console.error('Eval command error:', error);
            
            await sock.sendMessage(from, {
                text: `❌ *Critical Eval Error*\n\n**Error:** ${error.message}\n\n🚨 **SECURITY ALERT:** Code execution failed\n⚠️ **This could indicate a security issue or system error**\n\n**Recommended actions:**\n• Check system security\n• Review executed code\n• Monitor for suspicious activity\n• Consider restarting bot if needed`
            }, { quoted: message });
        }
    }
};