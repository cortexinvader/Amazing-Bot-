import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    config: {
        name: "help",
        author: "lance",
        version: "1.0.0",
        description: "Get a list of all commands or info about a specific command.",
        usage: "help [page] or help <command>",
        aliase: ["commands", "cmds", "menu"],
        role: 0,
        category: "utility"
    },
    onRun: async ({ message, font, args, senderID }) => {
        const imagesPath = path.join(__dirname, "..", "..", "cache", "tmp");
        const images = fs
            .readdirSync(imagesPath)
            .filter(file => file.endsWith(".png") || file.endsWith(".jpg") || file.endsWith(".webp"));
        const randomImage = images[Math.floor(Math.random() * images.length)];
        const imagePath = path.join(
            __dirname,
            "..",
            "..",
            "cache",
            "tmp",
            randomImage
        );

        const commands = Array.from(global.client.commands.values());
        const pushName = message.pushName || senderID.split("@")[0];
        const userID = senderID ? senderID.split("@")[0] : "unknown";
        const currentDate = new Date();
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' };
        const currentTime = currentDate.toLocaleTimeString('en-US', timeOptions);
        const currentDay = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        const currentDateFormatted = currentDate.toLocaleDateString('en-GB');
        
        if (args.length > 0 && !isNaN(args[0])) {
            const pageSize = 20;
            let page = parseInt(args[0], 10) || 1;
            if (page < 1) page = 1;

            const categories = {};
            for (const cmd of commands) {
                const cat = cmd.config?.category || "Uncategorized";
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(cmd);
            }

            const categoryEmojis = {
                admin: "🛡️", moderation: "⚖️", utility: "🔧", fun: "🎭", 
                music: "🎵", games: "🎮", economy: "💰", social: "👥",
                info: "📊", misc: "⭐", download: "📥", search: "🔍",
                ai: "🤖", anime: "🌸", owner: "⚡", tools: "🛠️",
                image: "🖼️", system: "⚙️", media: "📱", rank: "🏆"
            };

            const sortedCats = Object.keys(categories).sort();
            let allLines = [];
            
            for (const cat of sortedCats) {
                const emoji = categoryEmojis[cat.toLowerCase()] || "⭐";
                allLines.push(`\n╭──⦿【 ${emoji} ${font.bold(cat.toUpperCase())} 】`);
                const commandsInRow = [];
                categories[cat].forEach(cmd => {
                    commandsInRow.push(`✧${cmd.config.name}`);
                });
                const commandRows = [];
                for (let i = 0; i < commandsInRow.length; i += 6) {
                    commandRows.push(commandsInRow.slice(i, i + 6).join(' '));
                }
                allLines.push(...commandRows);
                allLines.push(`╰────────⦿`);
            }

            const totalPages = Math.ceil(allLines.length / pageSize);
            if (page > totalPages) page = totalPages;

            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            const pageLines = allLines.slice(start, end);

            let helpMessage = `╭──⦿【 ${font.bold("⚡ LAUGHING FOX")} 】\n`;
            helpMessage += `│ 🎯 ${font.bold("User:")} ${pushName}\n`;
            helpMessage += `│ 🔰 ${font.bold("ID:")} @${userID}\n`;
            helpMessage += `│ 👑 ${font.bold("Status:")} PREMIUM ELITE\n`;
            helpMessage += `│ ⚡ ${font.bold("Power:")} UNLIMITED ACCESS\n`;
            helpMessage += `│ 💎 ${font.bold("Credits:")} ∞ INFINITE\n`;
            helpMessage += `│ 🌐 ${font.bold("Prefix:")} ${font.mono(`${String(global.client.config.PREFIX)}`)}\n`;
            helpMessage += `│ 🤖 ${font.bold("System:")} Laughing fox v1\n`;
            helpMessage += `│ 👨‍💻 ${font.bold("Creator:")} @lance\n`;
            helpMessage += `│ 🔄 ${font.bold("Status:")} ONLINE & ACTIVE\n`;
            helpMessage += `│ 📅 ${font.bold("Date:")} ${currentDateFormatted}\n`;
            helpMessage += `│ 📆 ${font.bold("Day:")} ${currentDay}\n`;
            helpMessage += `│ ⏰ ${font.bold("Time:")} ${currentTime}\n`;
            helpMessage += `╰────────⦿\n`;
            
            helpMessage += pageLines.join("\n") + "\n";
            
            helpMessage += `╭──────────⦿\n`;
            helpMessage += `│ ${font.bold("𝗧𝗼𝘁𝗮𝗹 𝗰𝗺𝗱𝘀:")}「${commands.length}」\n`;
            helpMessage += `│ ${font.bold("𝗣𝗮𝗴𝗲:")} ${page}/${totalPages}\n`;
            helpMessage += `│ ${font.bold("𝗧𝘆𝗽𝗲:")} [ ${font.mono(`${String(global.client.config.PREFIX)}help <cmd>`)} ]\n`;
            helpMessage += `│ ${font.bold("𝘁𝗼 𝗹𝗲𝗮𝗿𝗻 𝘁𝗵𝗲 𝘂𝘀𝗮𝗴𝗲.")}\n`;
            helpMessage += `│ ${font.bold("𝗧𝘆𝗽𝗲:")} [ ${font.mono(`${String(global.client.config.PREFIX)}support`)} ] to join\n`;
            helpMessage += `│ Support Group\n`;
            helpMessage += `╰─────────────⦿\n`;
            helpMessage += `╭─────────────⦿\n`;
            helpMessage += `│💫 | [ ${font.bold("𝗟𝗮𝗻𝗰𝗲-𝗕𝗼𝘁 🍀")} ]\n`;
            helpMessage += `╰────────────⦿`;

            return await message.sendImage(helpMessage, imagePath, { quoted: message });
        }
        
        if (args.length > 0) {
            const cmdName = args[0].toLowerCase();
            const cmd = commands.find(
                c =>
                    c.config.name.toLowerCase() === cmdName ||
                    (Array.isArray(c.config.aliases) &&
                        c.config.aliases
                            .map(a => a.toLowerCase())
                            .includes(cmdName))
            );
            
            if (!cmd) {
                return message.reply(
                    `╭──⦿【 ${font.bold("❌ COMMAND ERROR")} 】\n│ Command "${font.mono(cmdName)}" not found\n│ Use ${font.mono(`${String(global.client.config.PREFIX)}help`)} to see all commands\n╰────────⦿`,
                    { quoted: message }
                );
            }
            
            let info = `╭──⦿【 ${font.bold("📋 COMMAND DETAILS")} 】\n`;
            info += `│ 🏷️ ${font.bold("Name:")} ${font.mono(cmd.config.name)}\n`;
            info += `│ 🔄 ${font.bold("Aliases:")} ${font.mono(
                Array.isArray(cmd.config.aliases) && cmd.config.aliases.length
                    ? cmd.config.aliases.join(", ")
                    : "None"
            )}\n`;
            info += `│ 📖 ${font.bold("Usage:")} ${font.mono(
                cmd.config.usage || "no usage info given"
            )}\n`;
            info += `│ 📝 ${font.bold("Description:")} ${cmd.config.description || "no description provided"}\n`;
            info += `│ 🔢 ${font.bold("Version:")} ${font.mono(cmd.config.version || "not given")}\n`;
            info += `│ 👤 ${font.bold("Author:")} ${font.mono(cmd.config.author || "unknown")}\n`;
            info += `│ 🎭 ${font.bold("Role:")} ${font.mono(String(
                typeof cmd.config.role !== "undefined" ? cmd.config.role : "0"
            ))}\n`;
            info += `│ 📂 ${font.bold("Category:")} ${font.mono(cmd.config.category || "Uncategorized")}\n`;
            info += `╰────────⦿\n`;
            info += `╭─────────────⦿\n`;
            info += `│💫 | [ ${font.bold("𝗟𝗮𝗻𝗰𝗲-𝗕𝗼𝘁 🍀")} ] - Command Analysis\n`;
            info += `╰────────────⦿`;
            
            return message.reply(info, { quoted: message });
        }
        
        const categories = {};
        for (const cmd of commands) {
            const cat = cmd.config?.category || "Uncategorized";
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd);
        }

        const categoryEmojis = {
            admin: "🛡️", moderation: "⚖️", utility: "🔧", fun: "🎭", 
            music: "🎵", games: "🎮", economy: "💰", social: "👥",
            info: "📊", misc: "⭐", download: "📥", search: "🔍",
            ai: "🤖", anime: "🌸", owner: "⚡", tools: "🛠️",
            image: "🖼️", system: "⚙️", media: "📱", rank: "🏆"
        };

        const sortedCats = Object.keys(categories).sort();
        let allLines = [];
        
        for (const cat of sortedCats) {
            const emoji = categoryEmojis[cat.toLowerCase()] || "⭐";
            allLines.push(`\n╭──⦿【 ${emoji} ${font.bold(cat.toUpperCase())} 】`);
            const commandsInRow = [];
            categories[cat].forEach(cmd => {
                commandsInRow.push(`✧${cmd.config.name}`);
            });
            const commandRows = [];
            for (let i = 0; i < commandsInRow.length; i += 6) {
                commandRows.push(commandsInRow.slice(i, i + 6).join(' '));
            }
            allLines.push(...commandRows);
            allLines.push(`╰────────⦿`);
        }

        let helpMessage = `╭──⦿【 ${font.bold("⚡ LAUGHING FOX")} 】\n`;
        helpMessage += `│ 🎯 ${font.bold("User:")} ${pushName}\n`;
        helpMessage += `│ 🔰 ${font.bold("ID:")} @${userID}\n`;
        helpMessage += `│ 👑 ${font.bold("Status:")} PREMIUM ELITE\n`;
        helpMessage += `│ ⚡ ${font.bold("Power:")} UNLIMITED ACCESS\n`;
        helpMessage += `│ 💎 ${font.bold("Credits:")} ∞ INFINITE\n`;
        helpMessage += `│ 🌐 ${font.bold("Prefix:")} ${font.mono(`${String(global.client.config.PREFIX)}`)}\n`;
        helpMessage += `│ 🤖 ${font.bold("System:")} Laughing fox v1\n`;
        helpMessage += `│ 👨‍💻 ${font.bold("Creator:")} @lance\n`;
        helpMessage += `│ 🔄 ${font.bold("Status:")} ONLINE & ACTIVE\n`;
        helpMessage += `│ 📅 ${font.bold("Date:")} ${currentDateFormatted}\n`;
        helpMessage += `│ 📆 ${font.bold("Day:")} ${currentDay}\n`;
        helpMessage += `│ ⏰ ${font.bold("Time:")} ${currentTime}\n`;
        helpMessage += `╰────────⦿\n`;
        
        helpMessage += allLines.join("\n") + "\n";
        
        helpMessage += `╭──────────⦿\n`;
        helpMessage += `│ ${font.bold("𝗧𝗼𝘁𝗮𝗹 𝗰𝗺𝗱𝘀:")}「${commands.length}」\n`;
        helpMessage += `│ ${font.bold("𝗧𝘆𝗽𝗲:")} [ ${font.mono(`${String(global.client.config.PREFIX)}help <cmd>`)} ]\n`;
        helpMessage += `│ ${font.bold("𝘁𝗼 𝗹𝗲𝗮𝗿𝗻 𝘁𝗵𝗲 𝘂𝘀𝗮𝗴𝗲.")}\n`;
        helpMessage += `│ ${font.bold("𝗧𝘆𝗽𝗲:")} [ ${font.mono(`${String(global.client.config.PREFIX)}support`)} ] to join\n`;
        helpMessage += `│ Support Group\n`;
        helpMessage += `╰─────────────⦿\n`;
        helpMessage += `╭─────────────⦿\n`;
        helpMessage += `│💫 | [ ${font.bold("𝗟𝗮𝗻𝗰𝗲-𝗕𝗼𝘁 🍀")} ]\n`;
        helpMessage += `╰────────────⦿`;

        return await message.sendImage(helpMessage, imagePath, { quoted: message });
    }
};
