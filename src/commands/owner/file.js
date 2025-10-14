import fs from 'fs-extra';
import path from 'path';

export default {
    name: 'file',
    aliases: ['addfile', 'createfile'],
    category: 'owner',
    description: 'Create or replace a command file manually via text',
    usage: 'file <category/filename.js> | <content>',
    example: 'file fun/test.js | export default { name: "test", ... }',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,
    supportsReact: true,

    async execute({ sock, message, args, from, sender }) {
        try {
            const fullText = args.join(' ');
            
            if (!fullText.includes('|')) {
                return await sock.sendMessage(from, {
                    text: '❌ *Invalid Format*\n\nUse: .file <category/filename.js> | <content>\n\n*Example:*\n.file fun/test.js | export default { name: "test", category: "fun", async execute() {} }\n\n*Valid Categories:*\nadmin, ai, downloader, economy, fun, games, general, media, owner, utility'
                }, { quoted: message });
            }

            const [filePath, ...contentParts] = fullText.split('|');
            const fileContent = contentParts.join('|').trim();
            const cleanPath = filePath.trim();

            if (!cleanPath || !fileContent) {
                return await sock.sendMessage(from, {
                    text: '❌ *Missing Data*\n\nBoth filepath and content are required.\n\n*Format:* .file <category/filename> | <content>'
                }, { quoted: message });
            }

            const validCategories = ['admin', 'ai', 'downloader', 'economy', 'fun', 'games', 'general', 'media', 'owner', 'utility'];
            let category = '';
            let filename = '';

            if (cleanPath.includes('/')) {
                const parts = cleanPath.split('/');
                category = parts[0].toLowerCase();
                filename = parts[parts.length - 1];
            } else {
                filename = cleanPath;
            }

            if (category && !validCategories.includes(category)) {
                return await sock.sendMessage(from, {
                    text: `❌ *Invalid Category*\n\n"${category}" is not a valid category.\n\n*Valid Categories:*\n${validCategories.join(', ')}`
                }, { quoted: message });
            }

            if (!filename.endsWith('.js')) {
                filename += '.js';
            }

            const finalPath = category 
                ? path.join(process.cwd(), 'src', 'commands', category, filename)
                : path.join(process.cwd(), cleanPath);

            const displayPath = category 
                ? `src/commands/${category}/${filename}`
                : cleanPath;

            const fileExists = await fs.pathExists(finalPath);

            if (fileExists) {
                const confirmMsg = await sock.sendMessage(from, {
                    text: `⚠️ *File Already Exists*\n\n*Path:* ${displayPath}\n*Category:* ${category || 'custom'}\n\nReact to this message:\n✅ - Replace the file\n❌ - Cancel operation`
                }, { quoted: message });

                await sock.sendMessage(from, {
                    react: { text: '✅', key: confirmMsg.key }
                });
                await sock.sendMessage(from, {
                    react: { text: '❌', key: confirmMsg.key }
                });

                this.setupReactionHandler(sock, from, confirmMsg.key.id, sender, finalPath, fileContent, displayPath, category);
            } else {
                await fs.ensureDir(path.dirname(finalPath));
                await fs.writeFile(finalPath, fileContent, 'utf8');

                await sock.sendMessage(from, {
                    text: `✅ *File Created*\n\n*Path:* ${displayPath}\n*Category:* ${category || 'custom'}\n*Size:* ${fileContent.length} bytes\n*Created by:* @${sender.split('@')[0]}\n*Date:* ${new Date().toLocaleString()}`,
                    mentions: [sender]
                }, { quoted: message });
            }

        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ *Error*\n\nFailed to create file: ${error.message}`
            }, { quoted: message });
        }
    },

    setupReactionHandler(sock, from, messageId, sender, filePath, fileContent, displayPath, category) {
        const reactionTimeout = setTimeout(() => {
            if (global.reactHandlers && global.reactHandlers[messageId]) {
                delete global.reactHandlers[messageId];
                sock.sendMessage(from, {
                    text: '⏰ *Operation Cancelled*\n\nReaction timeout (60s). Please try again.'
                });
            }
        }, 60000);

        if (!global.reactHandlers) {
            global.reactHandlers = {};
        }

        global.reactHandlers[messageId] = {
            command: this.name,
            timeout: reactionTimeout,
            handler: async (reactionEmoji, reactSender) => {
                if (reactSender !== sender) return;

                clearTimeout(reactionTimeout);

                if (reactionEmoji === '✅') {
                    try {
                        await fs.ensureDir(path.dirname(filePath));
                        await fs.writeFile(filePath, fileContent, 'utf8');

                        await sock.sendMessage(from, {
                            text: `✅ *File Replaced*\n\n*Path:* ${displayPath}\n*Category:* ${category || 'custom'}\n*Size:* ${fileContent.length} bytes\n*Replaced by:* @${sender.split('@')[0]}\n*Date:* ${new Date().toLocaleString()}`,
                            mentions: [sender]
                        });
                    } catch (error) {
                        await sock.sendMessage(from, {
                            text: `❌ *Error*\n\nFailed to replace file: ${error.message}`
                        });
                    }
                } else if (reactionEmoji === '❌') {
                    await sock.sendMessage(from, {
                        text: `❌ *Operation Cancelled*\n\n*Path:* ${displayPath}\n\nFile was not modified.`
                    });
                }

                delete global.reactHandlers[messageId];
            }
        };
    }
};
