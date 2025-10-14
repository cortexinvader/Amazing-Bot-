import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'cmd',
    aliases: ['command', 'cmds', 'plugin'],
    category: 'owner',
    description: 'Advanced command management system - install, get, find, delete, list, and reload commands',
    usage: 'cmd <action> [options]',
    example: 'cmd list\ncmd find ping\ncmd get general/ping.js\ncmd install https://example.com/command.js general\ncmd upload general\ncmd delete ping\ncmd reload ping',
    cooldown: 2,
    permissions: ['owner'],
    args: true,
    minArgs: 1,
    maxArgs: 10,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: true,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        const action = args[0].toLowerCase();
        const commandsDir = path.join(process.cwd(), 'src', 'commands');
        
        const categories = ['admin', 'ai', 'downloader', 'economy', 'fun', 'games', 'general', 'media', 'owner', 'utility'];

        try {
            switch (action) {
                case 'list':
                case 'ls': {
                    const category = args[1]?.toLowerCase();
                    let result = '📋 COMMAND LIST\n\n';
                    
                    if (category && categories.includes(category)) {
                        const categoryPath = path.join(commandsDir, category);
                        const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
                        result += `📁 Category: ${category.toUpperCase()}\n`;
                        result += `📊 Total: ${files.length} commands\n\n`;
                        files.forEach((file, i) => {
                            result += `${i + 1}. ${file.replace('.js', '')}\n`;
                        });
                    } else {
                        let totalCommands = 0;
                        result += 'Available Categories:\n';
                        for (const cat of categories) {
                            const categoryPath = path.join(commandsDir, cat);
                            if (fs.existsSync(categoryPath)) {
                                const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
                                totalCommands += files.length;
                                result += `${cat.padEnd(12)}: ${files.length} commands\n`;
                            }
                        }
                        result += `\n📊 Total: ${totalCommands} commands\n`;
                    }
                    
                    result += `\n💫 Ilom Bot 🍀`;
                    
                    await sock.sendMessage(from, { text: result }, { quoted: message });
                    break;
                }

                case 'find':
                case 'search': {
                    if (!args[1]) {
                        await sock.sendMessage(from, {
                            text: '❌ ERROR\nMessage: Command name required\n\n💡 Usage: cmd find <name>'
                        }, { quoted: message });
                        return;
                    }

                    const searchTerm = args[1].toLowerCase();
                    const results = [];

                    for (const category of categories) {
                        const categoryPath = path.join(commandsDir, category);
                        if (fs.existsSync(categoryPath)) {
                            const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
                            for (const file of files) {
                                if (file.toLowerCase().includes(searchTerm)) {
                                    results.push({
                                        category,
                                        file,
                                        path: path.join(category, file)
                                    });
                                }
                            }
                        }
                    }

                    if (results.length === 0) {
                        await sock.sendMessage(from, {
                            text: `🔍 SEARCH RESULTS\nQuery: ${searchTerm}\nFound: 0 commands\n\n❌ No matches found`
                        }, { quoted: message });
                        return;
                    }

                    let resultText = `🔍 SEARCH RESULTS\nQuery: ${searchTerm}\nFound: ${results.length} commands\n\n`;
                    results.forEach((r, i) => {
                        resultText += `${i + 1}. ${r.file.replace('.js', '')}\n   📁 ${r.category}\n   📄 ${r.path}\n\n`;
                    });
                    resultText += `\n💫 Ilom Bot 🍀`;

                    await sock.sendMessage(from, { text: resultText }, { quoted: message });
                    break;
                }

                case 'get':
                case 'show':
                case 'view':
                case 'download': {
                    if (!args[1]) {
                        await sock.sendMessage(from, {
                            text: '❌ ERROR\nMessage: Command path required\n\n💡 Usage: cmd get <category/file>\n📝 Example: cmd get general/ping.js'
                        }, { quoted: message });
                        return;
                    }

                    const cmdPath = args[1].replace(/\\/g, '/');
                    const fullPath = path.join(commandsDir, cmdPath);

                    if (!fs.existsSync(fullPath)) {
                        await sock.sendMessage(from, {
                            text: `❌ ERROR\nMessage: File not found\n\n📂 Path: ${cmdPath}`
                        }, { quoted: message });
                        return;
                    }

                    const content = fs.readFileSync(fullPath, 'utf8');
                    const fileName = path.basename(cmdPath);
                    const fileSize = (content.length / 1024).toFixed(2);
                    const lines = content.split('\n').length;

                    await sock.sendMessage(from, {
                        document: Buffer.from(content, 'utf8'),
                        mimetype: 'text/javascript',
                        fileName: fileName,
                        caption: `📄 COMMAND FILE\n📁 File: ${fileName}\n📂 Path: ${cmdPath}\n💾 Size: ${fileSize} KB\n📝 Lines: ${lines}\n\n💫 Ilom Bot 🍀`
                    }, { quoted: message });
                    break;
                }

                case 'install':
                case 'add': {
                    if (!args[1]) {
                        await sock.sendMessage(from, {
                            text: '❌ ERROR\nMessage: URL or path required\n\n💡 Usage: cmd install <url> [category]\n📝 Example: cmd install https://url.com/cmd.js general'
                        }, { quoted: message });
                        return;
                    }

                    const source = args[1];
                    const targetCategory = args[2]?.toLowerCase() || 'general';

                    if (!categories.includes(targetCategory)) {
                        await sock.sendMessage(from, {
                            text: `❌ ERROR\nMessage: Invalid category\n\n📁 Available:\n${categories.map(c => `   • ${c}`).join('\n')}`
                        }, { quoted: message });
                        return;
                    }

                    let content;
                    let fileName;

                    if (source.startsWith('http://') || source.startsWith('https://')) {
                        try {
                            const response = await axios.get(source);
                            content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
                            fileName = path.basename(new URL(source).pathname);
                            if (!fileName.endsWith('.js')) fileName += '.js';
                        } catch (error) {
                            await sock.sendMessage(from, {
                                text: `❌ ERROR\nMessage: Download failed\n\n🔗 URL: ${source}\n⚠️ Error: ${error.message}`
                            }, { quoted: message });
                            return;
                        }
                    } else {
                        if (!fs.existsSync(source)) {
                            await sock.sendMessage(from, {
                                text: `❌ ERROR\nMessage: File not found\n\n📂 Path: ${source}`
                            }, { quoted: message });
                            return;
                        }
                        content = fs.readFileSync(source, 'utf8');
                        fileName = path.basename(source);
                    }

                    const targetPath = path.join(commandsDir, targetCategory, fileName);

                    if (!fs.existsSync(targetPath)) {
                        fs.writeFileSync(targetPath, content);

                        const fileSize = (content.length / 1024).toFixed(2);

                        await sock.sendMessage(from, {
                            text: `✅ INSTALLED\n📄 File: ${fileName}\n📁 Category: ${targetCategory}\n📂 Path: ${targetCategory}/${fileName}\n💾 Size: ${fileSize} KB\n\n⚡ STATUS\n🔄 Restart bot to load\n\n💫 Ilom Bot 🍀`
                        }, { quoted: message });
                    } else {
                        const confirmationText = `⚠️ WARNING\nMessage: File already exists\n\n📄 File: ${fileName}\n📁 Category: ${targetCategory}\n\n💡 React ❤️ to replace`;
                        
                        const sentMsg = await sock.sendMessage(from, { text: confirmationText }, { quoted: message });
                        const confirmationKey = sentMsg.key;
                        
                        let replaced = false;
                        
                        const listener = (item) => {
                            if (item.type !== 'notify') return;
                            const m = item.messages[0];
                            if (
                                m.key.remoteJid === from &&
                                !m.key.fromMe &&
                                m.message?.reactionMessage &&
                                m.message.reactionMessage.key.remoteJid === from &&
                                m.message.reactionMessage.key.id === confirmationKey.id &&
                                m.message.reactionMessage.text === '❤️'
                            ) {
                                if (replaced) return;
                                replaced = true;
                                // Replace file
                                (async () => {
                                    try {
                                        fs.writeFileSync(targetPath, content);
                                        
                                        const fileSize = (content.length / 1024).toFixed(2);
                                        
                                        await sock.sendMessage(from, {
                                            text: `✅ INSTALLED (Replaced)\n📄 File: ${fileName}\n📁 Category: ${targetCategory}\n📂 Path: ${targetCategory}/${fileName}\n💾 Size: ${fileSize} KB\n\n⚡ STATUS\n🔄 Restart bot to load\n\n💫 Ilom Bot 🍀`
                                        }, { quoted: sentMsg });
                                    } catch (error) {
                                        await sock.sendMessage(from, {
                                            text: `❌ ERROR\nMessage: Replace failed\n\n⚠️ Error: ${error.message}`
                                        }, { quoted: sentMsg });
                                    } finally {
                                        sock.ev.removeListener('messages.upsert', listener);
                                    }
                                })();
                            }
                        };
                        
                        sock.ev.on('messages.upsert', listener);
                        
                        setTimeout(() => {
                            if (!replaced) {
                                sock.ev.removeListener('messages.upsert', listener);
                                // sock.sendMessage(from, { text: '❌ Confirmation timed out.' }, { quoted: sentMsg });
                            }
                        }, 60000);
                    }
                    break;
                }

                case 'upload':
                case 'attach': {
                    const targetCategory = args[1]?.toLowerCase() || 'general';

                    if (!categories.includes(targetCategory)) {
                        await sock.sendMessage(from, {
                            text: `❌ ERROR\nMessage: Invalid category\n\n📁 Available:\n${categories.map(c => `   • ${c}`).join('\n')}`
                        }, { quoted: message });
                        return;
                    }

                    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                    const documentMsg = quotedMsg?.documentMessage;

                    if (!documentMsg) {
                        await sock.sendMessage(from, {
                            text: `💡 UPLOAD GUIDE\nHow to use:\n\n1. Send your .js file\n2. Reply to it with:\n   ${prefix}cmd upload [category]\n\n📝 Example:\n   ${prefix}cmd upload general\n   ${prefix}cmd upload fun\n\n💫 Ilom Bot 🍀`
                        }, { quoted: message });
                        return;
                    }

                    const fileName = documentMsg.fileName;
                    
                    if (!fileName.endsWith('.js')) {
                        await sock.sendMessage(from, {
                            text: '❌ ERROR\nMessage: Invalid file type\n\n📄 Required: .js file'
                        }, { quoted: message });
                        return;
                    }

                    const targetPath = path.join(commandsDir, targetCategory, fileName);
                    const quotedMessageObj = message.message.extendedTextMessage.contextInfo.quotedMessage;

                    // Extract stanzaId safely
                    const contextInfo = message.message.extendedTextMessage?.contextInfo;
                    let stanzaId = null;
                    if (contextInfo && contextInfo.stanzaId) {
                        stanzaId = contextInfo.stanzaId;
                    } else {
                        await sock.sendMessage(from, {
                            text: `❌ ERROR\nMessage: Cannot access quoted message ID\n\n⚠️ Please ensure you're replying to a valid file message`
                        }, { quoted: message });
                        return;
                    }

                    const quotedKey = {
                        remoteJid: from,
                        id: stanzaId,
                        fromMe: false,
                        ...(isGroup && { participant: sender })
                    };

                    if (!fs.existsSync(targetPath)) {
                        try {
                            const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
                            
                            const buffer = await downloadMediaMessage(
                                { 
                                    message: quotedMessageObj,
                                    key: quotedKey
                                }, 
                                'buffer', 
                                {}
                            );
                            
                            fs.writeFileSync(targetPath, buffer);

                            const fileSize = (buffer.length / 1024).toFixed(2);

                            await sock.sendMessage(from, {
                                text: `✅ UPLOADED\n📄 File: ${fileName}\n📁 Category: ${targetCategory}\n📂 Path: ${targetCategory}/${fileName}\n💾 Size: ${fileSize} KB\n\n⚡ STATUS\n🔄 Restart bot to load\n\n💫 Ilom Bot 🍀`
                            }, { quoted: message });
                        } catch (error) {
                            await sock.sendMessage(from, {
                                text: `❌ ERROR\nMessage: Upload failed\n\n⚠️ Error: ${error.message}`
                            }, { quoted: message });
                        }
                    } else {
                        const confirmationText = `⚠️ WARNING\nMessage: File already exists\n\n📄 File: ${fileName}\n📁 Category: ${targetCategory}\n\n💡 React ❤️ to replace`;
                        
                        const sentMsg = await sock.sendMessage(from, { text: confirmationText }, { quoted: message });
                        const confirmationKey = sentMsg.key;
                        
                        let replaced = false;
                        
                        const listener = (item) => {
                            if (item.type !== 'notify') return;
                            const m = item.messages[0];
                            if (
                                m.key.remoteJid === from &&
                                !m.key.fromMe &&
                                m.message?.reactionMessage &&
                                m.message.reactionMessage.key.remoteJid === from &&
                                m.message.reactionMessage.key.id === confirmationKey.id &&
                                m.message.reactionMessage.text === '❤️'
                            ) {
                                if (replaced) return;
                                replaced = true;
                                // Download and replace
                                (async () => {
                                    try {
                                        const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
                                        const buffer = await downloadMediaMessage(
                                            { 
                                                message: quotedMessageObj,
                                                key: quotedKey
                                            }, 
                                            'buffer', 
                                            {}
                                        );
                                        
                                        fs.writeFileSync(targetPath, buffer);
                                        
                                        const fileSize = (buffer.length / 1024).toFixed(2);
                                        
                                        await sock.sendMessage(from, {
                                            text: `✅ UPLOADED (Replaced)\n📄 File: ${fileName}\n📁 Category: ${targetCategory}\n📂 Path: ${targetCategory}/${fileName}\n💾 Size: ${fileSize} KB\n\n⚡ STATUS\n🔄 Restart bot to load\n\n💫 Ilom Bot 🍀`
                                        }, { quoted: sentMsg });
                                    } catch (error) {
                                        await sock.sendMessage(from, {
                                            text: `❌ ERROR\nMessage: Replace failed\n\n⚠️ Error: ${error.message}`
                                        }, { quoted: sentMsg });
                                    } finally {
                                        sock.ev.removeListener('messages.upsert', listener);
                                    }
                                })();
                            }
                        };
                        
                        sock.ev.on('messages.upsert', listener);
                        
                        setTimeout(() => {
                            if (!replaced) {
                                sock.ev.removeListener('messages.upsert', listener);
                                // sock.sendMessage(from, { text: '❌ Confirmation timed out.' }, { quoted: sentMsg });
                            }
                        }, 60000);
                    }
                    break;
                }

                case 'delete':
                case 'remove':
                case 'rm': {
                    if (!args[1]) {
                        await sock.sendMessage(from, {
                            text: '❌ ERROR\nMessage: Command path required\n\n💡 Usage: cmd delete <category/file>\n📝 Example: cmd delete general/test.js'
                        }, { quoted: message });
                        return;
                    }

                    const cmdPath = args[1].replace(/\\/g, '/');
                    const fullPath = path.join(commandsDir, cmdPath);

                    if (!fs.existsSync(fullPath)) {
                        await sock.sendMessage(from, {
                            text: `❌ ERROR\nMessage: File not found\n\n📂 Path: ${cmdPath}`
                        }, { quoted: message });
                        return;
                    }

                    const fileName = path.basename(cmdPath);
                    fs.unlinkSync(fullPath);

                    await sock.sendMessage(from, {
                        text: `🗑️ DELETED\n📄 File: ${fileName}\n📂 Path: ${cmdPath}\n\n⚡ STATUS\n🔄 Restart bot to apply\n\n💫 Ilom Bot 🍀`
                    }, { quoted: message });
                    break;
                }

                case 'reload':
                case 'refresh': {
                    if (!args[1]) {
                        await sock.sendMessage(from, {
                            text: '❌ ERROR\nMessage: Command name required\n\n💡 Usage: cmd reload <name>\n📝 Example: cmd reload ping'
                        }, { quoted: message });
                        return;
                    }

                    const cmdName = args[1].toLowerCase();
                    let found = false;

                    for (const category of categories) {
                        const categoryPath = path.join(commandsDir, category);
                        if (!fs.existsSync(categoryPath)) continue;
                        
                        const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
                        for (const file of files) {
                            const filePath = path.join(categoryPath, file);
                            try {
                                const module = await import(`file://${filePath}?update=${Date.now()}`);
                                if (module.default.name === cmdName || module.default.aliases?.includes(cmdName)) {
                                    found = true;
                                    await sock.sendMessage(from, {
                                        text: `🔄 RELOADED\n📄 Command: ${cmdName}\n📁 Category: ${category}\n📂 File: ${file}\n\n⚡ STATUS\n✨ Ready to use!\n\n💫 Ilom Bot 🍀`
                                    }, { quoted: message });
                                    return;
                                }
                            } catch (error) {
                                continue;
                            }
                        }
                    }

                    if (!found) {
                        await sock.sendMessage(from, {
                            text: `❌ ERROR\nMessage: Command not found\n\n🔍 Name: ${cmdName}`
                        }, { quoted: message });
                    }
                    break;
                }

                case 'info':
                case 'details': {
                    if (!args[1]) {
                        await sock.sendMessage(from, {
                            text: '❌ ERROR\nMessage: Command name required\n\n💡 Usage: cmd info <name>\n📝 Example: cmd info ping'
                        }, { quoted: message });
                        return;
                    }

                    const cmdName = args[1].toLowerCase();
                    let found = false;

                    for (const category of categories) {
                        const categoryPath = path.join(commandsDir, category);
                        if (!fs.existsSync(categoryPath)) continue;
                        
                        const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
                        for (const file of files) {
                            const filePath = path.join(categoryPath, file);
                            try {
                                const module = await import(`file://${filePath}?update=${Date.now()}`);
                                const cmd = module.default;
                                
                                if (cmd.name === cmdName || cmd.aliases?.includes(cmdName)) {
                                    found = true;
                                    let info = `ℹ️ COMMAND INFO\n`;
                                    info += `📝 Name: ${cmd.name}\n`;
                                    info += `🏷️ Aliases: ${cmd.aliases?.join(', ') || 'None'}\n`;
                                    info += `📁 Category: ${category}\n`;
                                    info += `📄 File: ${file}\n`;
                                    info += `📖 Desc: ${cmd.description || 'No description'}\n`;
                                    info += `💡 Usage: ${prefix}${cmd.usage || cmd.name}\n`;
                                    info += `⏱️ Cooldown: ${cmd.cooldown || 0}s\n`;
                                    info += `🔒 Permissions: ${cmd.permissions?.join(', ') || 'All'}\n`;
                                    info += `💎 Premium: ${cmd.premium ? 'Yes' : 'No'}\n`;
                                    info += `👁️ Hidden: ${cmd.hidden ? 'Yes' : 'No'}\n`;
                                    if (cmd.example) {
                                        info += `\n📝 Example:\n${cmd.example.split('\n').map(line => `   ${line}`).join('\n')}\n`;
                                    }
                                    info += `\n💫 Ilom Bot 🍀`;

                                    await sock.sendMessage(from, { text: info }, { quoted: message });
                                    return;
                                }
                            } catch (error) {
                                continue;
                            }
                        }
                    }

                    if (!found) {
                        await sock.sendMessage(from, {
                            text: `❌ ERROR\nMessage: Command not found\n\n🔍 Name: ${cmdName}`
                        }, { quoted: message });
                    }
                    break;
                }

                default: {
                    const helpText = `🛠️ CMD MANAGEMENT\n\n📋 Available Actions:\n\n📂 list [category] - List commands\n🔍 find <name> - Search commands\n📥 get <path> - Download command\n📦 install <url> [category] - Install from URL\n📤 upload [category] - Upload from file\n🗑️ delete <path> - Remove command\n🔄 reload <name> - Reload command\nℹ️ info <name> - Show details\n\n📝 Examples:\n• ${prefix}cmd list fun\n• ${prefix}cmd find ping\n• ${prefix}cmd get general/ping.js\n• ${prefix}cmd info help\n• ${prefix}cmd reload menu\n\n💫 Ilom Bot 🍀`;
                    
                    await sock.sendMessage(from, { text: helpText }, { quoted: message });
                    break;
                }
            }

        } catch (error) {
            console.error('CMD command error:', error);
            await sock.sendMessage(from, {
                text: `❌ SYSTEM ERROR\nMessage: ${error.message}\n\n⚠️ Command system error\n🔄 Please try again`
            }, { quoted: message });
        }
    }
};