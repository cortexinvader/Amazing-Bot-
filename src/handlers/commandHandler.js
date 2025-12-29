import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = new Map();
const aliases = new Map();
const categories = new Map();
const commandUsageStats = new Map();

class CommandManager {
    constructor() {
        this.commandsDir = path.join(__dirname, '../commands');
        this.initialized = false;
    }

    async initializeCommands() {
        if (this.initialized) {
            return;
        }

        try {
            await this.loadAllCommands();
            this.initialized = true;
            logger.info(`Loaded ${commands.size} commands from ${categories.size} categories`);
        } catch (error) {
            logger.error('Failed to initialize commands:', error);
            throw error;
        }
    }

    async loadAllCommands() {
        const categoriesPath = await fs.readdir(this.commandsDir);

        for (const category of categoriesPath) {
            const categoryPath = path.join(this.commandsDir, category);
            const stat = await fs.stat(categoryPath);

            if (!stat.isDirectory()) continue;

            const files = await fs.readdir(categoryPath);
            const jsFiles = files.filter(f => f.endsWith('.js'));

            for (const file of jsFiles) {
                try {
                    await this.loadCommand(category, file);
                } catch (error) {
                    logger.error(`Failed to load ${file}:`, error);
                }
            }
        }
    }

    async loadCommand(category, file) {
        const filePath = path.join(this.commandsDir, category, file);
        const commandModule = await import(`file://${filePath}`);
        const command = commandModule.default;

        if (!command || !command.name) {
            logger.warn(`Invalid command in ${file}`);
            return;
        }

        command.category = command.category || category;
        command.filePath = filePath;

        commands.set(command.name, command);

        if (command.aliases && Array.isArray(command.aliases)) {
            command.aliases.forEach(alias => {
                aliases.set(alias, command.name);
            });
        }

        if (!categories.has(category)) {
            categories.set(category, []);
        }
        categories.get(category).push(command);

        logger.debug(`Loaded command: ${command.name} [${category}]`);
    }

    async reloadCommand(commandName) {
        const command = commands.get(commandName) || commands.get(aliases.get(commandName));
        
        if (!command) {
            throw new Error(`Command ${commandName} not found`);
        }

        const { filePath, category } = command;

        if (command.aliases) {
            command.aliases.forEach(alias => aliases.delete(alias));
        }

        commands.delete(command.name);

        const categoryCommands = categories.get(category);
        if (categoryCommands) {
            const index = categoryCommands.findIndex(cmd => cmd.name === command.name);
            if (index !== -1) {
                categoryCommands.splice(index, 1);
            }
        }

        delete require.cache[require.resolve(filePath)];

        const fileName = path.basename(filePath);
        await this.loadCommand(category, fileName);

        logger.info(`Reloaded command: ${commandName}`);
    }
}

export const commandManager = new CommandManager();

export function getCommand(commandName) {
    const name = commandName.toLowerCase();
    return commands.get(name) || commands.get(aliases.get(name));
}

export function getAllCommands() {
    return Array.from(commands.values());
}

export function getCommandsByCategory(category) {
    return categories.get(category) || [];
}

export function getAllCategories() {
    return Array.from(categories.keys());
}

export function searchCommands(query) {
    const searchTerm = query.toLowerCase();
    return Array.from(commands.values()).filter(cmd => 
        cmd.name.toLowerCase().includes(searchTerm) ||
        (cmd.description && cmd.description.toLowerCase().includes(searchTerm)) ||
        (cmd.aliases && cmd.aliases.some(alias => alias.toLowerCase().includes(searchTerm)))
    );
}

export function recordCommandUsage(commandName, executionTime, success) {
    if (!commandUsageStats.has(commandName)) {
        commandUsageStats.set(commandName, {
            count: 0,
            successCount: 0,
            failureCount: 0,
            totalTime: 0
        });
    }
    
    const stats = commandUsageStats.get(commandName);
    stats.count++;
    if (success) {
        stats.successCount++;
    } else {
        stats.failureCount++;
    }
    stats.totalTime += executionTime;
    
    commandUsageStats.set(commandName, stats);
}

export function getSystemStats() {
    const totalExecutions = Array.from(commandUsageStats.values()).reduce((sum, cmd) => sum + cmd.count, 0);
    const successfulExecutions = Array.from(commandUsageStats.values()).reduce((sum, cmd) => sum + cmd.successCount, 0);
    
    const commandUsage = {};
    commandUsageStats.forEach((stats, name) => {
        commandUsage[name] = {
            count: stats.count,
            successCount: stats.successCount,
            failureCount: stats.failureCount,
            totalTime: stats.totalTime,
            avgTime: stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0
        };
    });
    
    return {
        totalExecutions,
        successfulExecutions,
        failedExecutions: totalExecutions - successfulExecutions,
        commandUsage
    };
}

export function getCommandUsageStats() {
    return Object.fromEntries(commandUsageStats);
}

export function clearCommandStats() {
    commandUsageStats.clear();
}

export default commandManager;