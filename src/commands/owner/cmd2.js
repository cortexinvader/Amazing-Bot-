import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import logger from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'cmd2',
    aliases: ['cmdm', 'cmdmanager', 'commandmanager'],
    category: 'owner',
    description: '🎯 Advanced Command Manager - Install, manage, and control bot commands with ease. Supports URL installation, inline code, file uploads, and smart confirmation system.',
    usage: 'cmd2 <action> [options]',
    example: `cmd2 install https://pastebin.com/raw/xyz general
cmd2 upload general (reply to .js file)
cmd2 code general newcmd (write code inline)
cmd2 view general/ping.js
cmd2 delete general/test.js
cmd2 list general
cmd2 reload ping
cmd2 enable ping
cmd2 disable ping
cmd2 info ping`,
    cooldown: 3,
    permissions: ['owner'],
    args: true,
    minArgs: 1,
    maxArgs: 20,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: true,

    async execute({ sock, message, args, from, sender, isGroup, prefix }) {
        const action = args[0].toLowerCase();
        const commandsDir = path.join(process.cwd(), 'src', 'commands');
        const categories = ['admin', 'ai', 'downloader', 'economy', 'fun', 'games', 'general', 'media', 'owner', 'utility'];

        // Helper function to setup reaction listener
        const setupReactionListener = (sentMsg, callback, timeout = 60000) => {
            let handled = false;
            const listener = (item) => {
                if (item.type !== 'notify') return;
                const m = item.messages[0];
                if (
                    m.key.remoteJid === from &&
                    !m.key.fromMe &&
                    m.message?.reactionMessage &&
                    m.message.reactionMessage.key.id === sentMsg.key.id
                ) {
                    if (handled) return;
                    const emoji = m.message.reactionMessage.text;
                    handled = true;
                    sock.ev.removeListener('messages.upsert', listener);
                    callback(emoji);
                }
            };
            
            sock.ev.on('messages.upsert', listener);
            
            setTimeout(() => {
                if (!handled) {
                    sock.ev.removeListener('messages.upsert', listener);
                }
            }, timeout);
        };

        try {
            switch (action) {
                // ═══════════════════════════════════════
                // LIST COMMANDS
                // ═══════════════════════════════════════
                case 'list':
                case 'ls':
                case 'all': {
                    const category = args[1]?.toLowerCase();
                    let result = '╭─────⦿ 📋 CMD MANAGER ⦿─────\n';
                    
                    if (category && categories.includes(category)) {
                        const categoryPath = path.join(commandsDir, category);
                        const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
                        result += `│\n│ 📁 *${category.toUpperCase()}*\n`;
                        result += `│ 📊 Total: ${files.length} commands\n│\n`;
                        files.forEach((file, i) => {
                            result += `│ ${i + 1}. ${file.replace('.js', '')}\n`;
                        });
                    } else {
                        let totalCommands = 0;
                        result += `│\n│ 📚 *ALL CATEGORIES*\n│\n`;
                        for (const cat of categories) {
                            const categoryPath = path.join(commandsDir, cat);
                            if (fs.existsSync(categoryPath)) {
                                const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
                                totalCommands += files.length;
                                result += `│ ${cat.padEnd(12)} │ ${files.length.toString().padStart(3)} cmds\n`;
                            }
                        }
                        result += `│\n│ 🎯 *Total: ${totalCommands} commands*\n`;
                        result += `│\n│ 💡 Use: ${prefix}cmd2 list <category>\n`;
                    }
                    
                    result += `╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`;
                    
                    await sock.sendMessage(from, { text: result }, { quoted: message });
                    break;
                }

                // ═══════════════════════════════════════
                // INSTALL FROM URL
                // ═══════════════════════════════════════
                case 'install':
                case 'add':
                case 'i': {
                    if (!args[1]) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ❌ ERROR ⦿─────\n│\n│ *Usage:*\n│ ${prefix}cmd2 install <url> [category]\n│\n│ *Example:*\n│ ${prefix}cmd2 install https://pastebin.com/raw/xyz general\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    const url = args[1];
                    const targetCategory = args[2]?.toLowerCase() || 'general';

                    if (!categories.includes(targetCategory)) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ❌ INVALID CATEGORY ⦿─────\n│\n│ Available categories:\n${categories.map(c => `│ • ${c}`).join('\n')}\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ❌ ERROR ⦿─────\n│\n│ *Invalid URL*\n│ URL must start with http:// or https://\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    const loadingMsg = await sock.sendMessage(from, {
                        text: `⏳ *Downloading...*\n\n🔗 ${url}\n📁 Category: ${targetCategory}`
                    }, { quoted: message });

                    try {
                        const response = await axios.get(url, { timeout: 30000 });
                        const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
                        
                        let fileName = args[3] || path.basename(new URL(url).pathname);
                        if (!fileName.endsWith('.js')) fileName += '.js';
                        if (!fileName.includes('.js')) fileName = 'command.js';

                        const targetPath = path.join(commandsDir, targetCategory, fileName);
                        const fileSize = (content.length / 1024).toFixed(2);

                        if (fs.existsSync(targetPath)) {
                            const confirmMsg = await sock.sendMessage(from, {
                                text: `╭─────⦿ ⚠️ WARNING ⦿─────\n│\n│ *File Exists!*\n│ 📄 ${fileName}\n│ 📁 ${targetCategory}\n│\n│ 💡 React ✅ to replace\n│ 💡 React ❌ to cancel\n│\n╰──────────────────────⦿`
                            }, { quoted: message });

                            setupReactionListener(confirmMsg, async (emoji) => {
                                if (emoji === '✅') {
                                    fs.writeFileSync(targetPath, content);
                                    await sock.sendMessage(from, {
                                        text: `╭─────⦿ ✅ INSTALLED ⦿─────\n│\n│ 📄 *File:* ${fileName}\n│ 📁 *Category:* ${targetCategory}\n│ 💾 *Size:* ${fileSize} KB\n│ 🔄 *Status:* Replaced\n│\n│ ⚡ Restart bot to load\n│\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`
                                    }, { quoted: confirmMsg });
                                } else {
                                    await sock.sendMessage(from, {
                                        text: `❌ Installation cancelled.`
                                    }, { quoted: confirmMsg });
                                }
                            });
                        } else {
                            fs.writeFileSync(targetPath, content);
                            await sock.sendMessage(from, {
                                text: `╭─────⦿ ✅ INSTALLED ⦿─────\n│\n│ 📄 *File:* ${fileName}\n│ 📁 *Category:* ${targetCategory}\n│ 💾 *Size:* ${fileSize} KB\n│ 📂 *Path:* ${targetCategory}/${fileName}\n│\n│ ⚡ Restart bot to load\n│\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`
                            }, { quoted: message });
                        }
                    } catch (error) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ❌ DOWNLOAD FAILED ⦿─────\n│\n│ 🔗 *URL:* ${url}\n│ ⚠️ *Error:* ${error.message}\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                    }
                    break;
                }

                // ═══════════════════════════════════════
                // INSTALL INLINE CODE
                // ═══════════════════════════════════════
                case 'code':
                case 'create':
                case 'new': {
                    if (!args[1] || !args[2]) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ❌ ERROR ⦿─────\n│\n│ *Usage:*\n│ ${prefix}cmd2 code <category> <name>\n│\n│ *Example:*\n│ ${prefix}cmd2 code general test\n│ (Then paste your code)\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    const targetCategory = args[1].toLowerCase();
                    let fileName = args[2];
                    if (!fileName.endsWith('.js')) fileName += '.js';

                    if (!categories.includes(targetCategory)) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ❌ INVALID CATEGORY ⦿─────\n│\n│ Available categories:\n${categories.map(c => `│ • ${c}`).join('\n')}\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    const waitMsg = await sock.sendMessage(from, {
                        text: `╭─────⦿ 📝 WAITING FOR CODE ⦿─────\n│\n│ 📁 *Category:* ${targetCategory}\n│ 📄 *File:* ${fileName}\n│\n│ 💡 Send your code in next message\n│ ⏱️ Timeout: 5 minutes\n│\n╰──────────────────────⦿`
                    }, { quoted: message });

                    let codeReceived = false;
                    const codeListener = (item) => {
                        if (item.type !== 'notify') return;
                        const m = item.messages[0];
                        if (m.key.remoteJid === from && m.key.participant === sender && !m.key.fromMe) {
                            const text = m.message?.conversation || m.message?.extendedTextMessage?.text;
                            if (text && !codeReceived) {
                                codeReceived = true;
                                sock.ev.removeListener('messages.upsert', codeListener);
                                
                                (async () => {
                                    const targetPath = path.join(commandsDir, targetCategory, fileName);
                                    const fileSize = (text.length / 1024).toFixed(2);

                                    if (fs.existsSync(targetPath)) {
                                        const confirmMsg = await sock.sendMessage(from, {
                                            text: `╭─────⦿ ⚠️ WARNING ⦿─────\n│\n│ *File Exists!*\n│ 📄 ${fileName}\n│ 📁 ${targetCategory}\n│\n│ 💡 React ✅ to replace\n│ 💡 React ❌ to cancel\n│\n╰──────────────────────⦿`
                                        }, { quoted: m });

                                        setupReactionListener(confirmMsg, async (emoji) => {
                                            if (emoji === '✅') {
                                                fs.writeFileSync(targetPath, text);
                                                await sock.sendMessage(from, {
                                                    text: `╭─────⦿ ✅ CREATED ⦿─────\n│\n│ 📄 *File:* ${fileName}\n│ 📁 *Category:* ${targetCategory}\n│ 💾 *Size:* ${fileSize} KB\n│ 🔄 *Status:* Replaced\n│\n│ ⚡ Restart bot to load\n│\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`
                                                }, { quoted: confirmMsg });
                                            } else {
                                                await sock.sendMessage(from, {
                                                    text: `❌ Creation cancelled.`
                                                }, { quoted: confirmMsg });
                                            }
                                        });
                                    } else {
                                        fs.writeFileSync(targetPath, text);
                                        await sock.sendMessage(from, {
                                            text: `╭─────⦿ ✅ CREATED ⦿─────\n│\n│ 📄 *File:* ${fileName}\n│ 📁 *Category:* ${targetCategory}\n│ 💾 *Size:* ${fileSize} KB\n│ 📂 *Path:* ${targetCategory}/${fileName}\n│\n│ ⚡ Restart bot to load\n│\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`
                                        }, { quoted: m });
                                    }
                                })();
                            }
                        }
                    };

                    sock.ev.on('messages.upsert', codeListener);

                    setTimeout(() => {
                        if (!codeReceived) {
                            sock.ev.removeListener('messages.upsert', codeListener);
                        }
                    }, 300000);
                    break;
                }

                // ═══════════════════════════════════════
                // UPLOAD FILE
                // ═══════════════════════════════════════
                case 'upload':
                case 'attach':
                case 'u': {
                    const targetCategory = args[1]?.toLowerCase() || 'general';

                    if (!categories.includes(targetCategory)) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ❌ INVALID CATEGORY ⦿─────\n│\n│ Available categories:\n${categories.map(c => `│ • ${c}`).join('\n')}\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                    const documentMsg = quotedMsg?.documentMessage;

                    if (!documentMsg) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ 💡 UPLOAD GUIDE ⦿─────\n│\n│ *How to upload:*\n│\n│ 1. Send your .js file as document\n│ 2. Reply to it with:\n│    ${prefix}cmd2 upload [category]\n│\n│ *Examples:*\n│ ${prefix}cmd2 upload general\n│ ${prefix}cmd2 upload fun\n│\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`
                        }, { quoted: message });
                        return;
                    }

                    const fileName = documentMsg.fileName;
                    
                    if (!fileName.endsWith('.js')) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ❌ ERROR ⦿─────\n│\n│ *Invalid file type*\n│ Required: .js file\n│ Received: ${fileName}\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    try {
                        const targetPath = path.join(commandsDir, targetCategory, fileName);
                        const quotedMessageObj = message.message.extendedTextMessage.contextInfo.quotedMessage;
                        const contextInfo = message.message.extendedTextMessage?.contextInfo;
                        const stanzaId = contextInfo?.stanzaId;

                        if (!stanzaId) {
                            await sock.sendMessage(from, {
                                text: `╭─────⦿ ❌ ERROR ⦿─────\n│\n│ Cannot access quoted message\n│ Please reply to a valid file\n│\n╰──────────────────────⦿`
                            }, { quoted: message });
                            return;
                        }

                        const quotedKey = {
                            remoteJid: from,
                            id: stanzaId,
                            fromMe: false,
                            ...(isGroup && { participant: sender })
                        };

                        const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
                        const buffer = await downloadMediaMessage(
                            { message: quotedMessageObj, key: quotedKey },
                            'buffer',
                            {}
                        );

                        const fileSize = (buffer.length / 1024).toFixed(2);

                        if (fs.existsSync(targetPath)) {
                            const confirmMsg = await sock.sendMessage(from, {
                                text: `╭─────⦿ ⚠️ WARNING ⦿─────\n│\n│ *File Exists!*\n│ 📄 ${fileName}\n│ 📁 ${targetCategory}\n│\n│ 💡 React ✅ to replace\n│ 💡 React ❌ to cancel\n│\n╰──────────────────────⦿`
                            }, { quoted: message });

                            setupReactionListener(confirmMsg, async (emoji) => {
                                if (emoji === '✅') {
                                    fs.writeFileSync(targetPath, buffer);
                                    await sock.sendMessage(from, {
                                        text: `╭─────⦿ ✅ UPLOADED ⦿─────\n│\n│ 📄 *File:* ${fileName}\n│ 📁 *Category:* ${targetCategory}\n│ 💾 *Size:* ${fileSize} KB\n│ 🔄 *Status:* Replaced\n│\n│ ⚡ Restart bot to load\n│\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`
                                    }, { quoted: confirmMsg });
                                } else {
                                    await sock.sendMessage(from, {
                                        text: `❌ Upload cancelled.`
                                    }, { quoted: confirmMsg });
                                }
                            });
                        } else {
                            fs.writeFileSync(targetPath, buffer);
                            await sock.sendMessage(from, {
                                text: `╭─────⦿ ✅ UPLOADED ⦿─────\n│\n│ 📄 *File:* ${fileName}\n│ 📁 *Category:* ${targetCategory}\n│ 💾 *Size:* ${fileSize} KB\n│ 📂 *Path:* ${targetCategory}/${fileName}\n│\n│ ⚡ Restart bot to load\n│\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`
                            }, { quoted: message });
                        }
                    } catch (error) {
                        logger.error('Upload error:', error);
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ❌ UPLOAD FAILED ⦿─────\n│\n│ ⚠️ *Error:* ${error.message}\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                    }
                    break;
                }

                // ═══════════════════════════════════════
                // VIEW/GET FILE
                // ═══════════════════════════════════════
                case 'view':
                case 'get':
                case 'show':
                case 'download':
                case 'v': {
                    if (!args[1]) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ❌ ERROR ⦿─────\n│\n│ *Usage:*\n│ ${prefix}cmd2 view <category/file>\n│\n│ *Example:*\n│ ${prefix}cmd2 view general/ping.js\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    const cmdPath = args[1].replace(/\\/g, '/');
                    const fullPath = path.join(commandsDir, cmdPath);

                    if (!fs.existsSync(fullPath)) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ❌ NOT FOUND ⦿─────\n│\n│ 📂 *Path:* ${cmdPath}\n│ ❌ File does not exist\n│\n╰──────────────────────⦿`
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
                        caption: `╭─────⦿ 📄 COMMAND FILE ⦿─────\n│\n│ 📁 *File:* ${fileName}\n│ 📂 *Path:* ${cmdPath}\n│ 💾 *Size:* ${fileSize} KB\n│ 📝 *Lines:* ${lines}\n│\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`
                    }, { quoted: message });
                    break;
                }

                // ═══════════════════════════════════════
                // DELETE COMMAND
                // ═══════════════════════════════════════
                case 'delete':
                case 'remove':
                case 'rm':
                case 'd': {
                    if (!args[1]) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ❌ ERROR ⦿─────\n│\n│ *Usage:*\n│ ${prefix}cmd2 delete <category/file>\n│\n│ *Example:*\n│ ${prefix}cmd2 delete general/test.js\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    const cmdPath = args[1].replace(/\\/g, '/');
                    const fullPath = path.join(commandsDir, cmdPath);

                    if (!fs.existsSync(fullPath)) {
                        await sock.sendMessage(from, {
                            text: `╭─────⦿ ❌ NOT FOUND ⦿─────\n│\n│ 📂 *Path:* ${cmdPath}\n│ ❌ File does not exist\n│\n╰──────────────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    const fileName = path.basename(cmdPath);
                    const confirmMsg = await sock.sendMessage(from, {
                        text: `╭─────⦿ ⚠️ CONFIRM DELETE ⦿─────\n│\n│ *Are you sure?*\n│ 📄 ${fileName}\n│ 📂 ${cmdPath}\n│\n│ 💡 React ✅ to delete\n│ 💡 React ❌ to cancel\n│\n│ ⚠️ This cannot be undone!\n│\n╰──────────────────────⦿`
                    }, { quoted: message });

                    setupReactionListener(confirmMsg, async (emoji) => {
                        if (emoji === '✅') {
                            fs.unlinkSync(fullPath);
                            await sock.sendMessage(from, {
                                text: `╭─────⦿ 🗑️ DELETED ⦿─────\n│\n│ 📄 *File:* ${fileName}\n│ 📂 *Path:* ${cmdPath}\n│\n│ ⚡ Restart bot to apply\n│\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`
                            }, { quoted: confirmMsg });
                        } else {
                            await sock.sendMessage(from, {
                                text: `❌ Deletion cancelled.`
                            }, { quoted: confirmMsg });
                        }
                    });
                    break;
                }

                // ═══════════════════════════════════════
                // DEFAULT - SHOW HELP
                // ═══════════════════════════════════════
                default: {
                    await sock.sendMessage(from, {
                        text: `╭─────⦿ 🎯 CMD2 MANAGER ⦿─────\n│\n│ *AVAILABLE ACTIONS:*\n│\n│ 📋 *list* [category]\n│    View all commands\n│\n│ 🔽 *install* <url> [category]\n│    Install from URL\n│\n│ 📝 *code* <category> <name>\n│    Create with inline code\n│\n│ 📤 *upload* [category]\n│    Upload .js file (reply to file)\n│\n│ 👁️ *view* <category/file>\n│    View/download command file\n│\n│ 🗑️ *delete* <category/file>\n│    Delete command file\n│\n│ *EXAMPLES:*\n│ ${prefix}cmd2 list general\n│ ${prefix}cmd2 install https://url/cmd.js fun\n│ ${prefix}cmd2 code general test\n│ ${prefix}cmd2 upload general\n│ ${prefix}cmd2 view general/ping.js\n│ ${prefix}cmd2 delete general/test.js\n│\n╰──────────────────────⦿\n\n💫 Ilom Bot 🍀`
                    }, { quoted: message });
                }
            }
        } catch (error) {
            logger.error('cmd2 error:', error);
            await sock.sendMessage(from, {
                text: `╭─────⦿ ❌ SYSTEM ERROR ⦿─────\n│\n│ ⚠️ *Error:* ${error.message}\n│\n│ 📝 Check logs for details\n│\n╰──────────────────────⦿`
            }, { quoted: message });
        }
    }
};