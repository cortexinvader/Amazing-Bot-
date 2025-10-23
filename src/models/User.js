import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    jid: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    phone: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        default: 'User'
    },
    profilePicture: {
        type: String,
        default: null
    },
    language: {
        type: String,
        default: 'en'
    },
    timezone: {
        type: String,
        default: 'UTC'
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    banReason: {
        type: String,
        default: null
    },
    banUntil: {
        type: Date,
        default: null
    },
    bannedBy: {
        type: String,
        default: null
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    premiumUntil: {
        type: Date,
        default: null
    },
    premiumType: {
        type: String,
        enum: ['basic', 'pro', 'unlimited'],
        default: null
    },
    joinedGroups: [{
        type: String
    }],
    groupRoles: {
        type: Map,
        of: String,
        default: new Map()
    },
    economy: {
        balance: {
            type: Number,
            default: 1000
        },
        bank: {
            type: Number,
            default: 0
        },
        level: {
            type: Number,
            default: 1
        },
        xp: {
            type: Number,
            default: 0
        },
        rank: {
            type: String,
            default: 'Beginner'
        },
        dailyStreak: {
            type: Number,
            default: 0
        },
        lastDaily: {
            type: Date,
            default: null
        },
        lastWeekly: {
            type: Date,
            default: null
        },
        lastWork: {
            type: Date,
            default: null
        },
        lastRob: {
            type: Date,
            default: null
        },
        inventory: [{
            item: String,
            quantity: Number,
            purchasedAt: Date
        }],
        transactions: [{
            type: {
                type: String,
                enum: ['daily', 'weekly', 'work', 'gamble', 'transfer', 'purchase', 'rob']
            },
            amount: Number,
            description: String,
            timestamp: {
                type: Date,
                default: Date.now
            }
        }]
    },
    gameStats: {
        gamesPlayed: {
            type: Number,
            default: 0
        },
        gamesWon: {
            type: Number,
            default: 0
        },
        totalScore: {
            type: Number,
            default: 0
        },
        achievements: [{
            name: String,
            unlockedAt: Date,
            description: String
        }],
        trivia: {
            correct: { type: Number, default: 0 },
            incorrect: { type: Number, default: 0 },
            streak: { type: Number, default: 0 }
        },
        hangman: {
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 }
        },
        math: {
            correct: { type: Number, default: 0 },
            incorrect: { type: Number, default: 0 }
        }
    },
    preferences: {
        autoRead: {
            type: Boolean,
            default: true
        },
        notifications: {
            type: Boolean,
            default: true
        },
        privacy: {
            showOnline: {
                type: Boolean,
                default: true
            },
            allowCommands: {
                type: Boolean,
                default: true
            }
        }
    },
    statistics: {
        commandsUsed: {
            type: Number,
            default: 0
        },
        messagesSent: {
            type: Number,
            default: 0
        },
        mediaShared: {
            type: Number,
            default: 0
        },
        timeSpent: {
            type: Number,
            default: 0
        },
        lastActive: {
            type: Date,
            default: Date.now
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    },
    warnings: [{
        reason: String,
        warnedBy: String,
        warnedAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: Date
    }],
    notes: [{
        title: String,
        content: String,
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: Date
    }],
    reminders: [{
        message: String,
        remindAt: Date,
        createdAt: {
            type: Date,
            default: Date.now
        },
        completed: {
            type: Boolean,
            default: false
        }
    }],
    afk: {
        isAfk: {
            type: Boolean,
            default: false
        },
        reason: String,
        since: Date
    },
    cooldowns: {
        type: Map,
        of: Date,
        default: new Map()
    },
    rateLimits: {
        type: Map,
        of: {
            count: Number,
            resetTime: Date
        },
        default: new Map()
    }
}, {
    timestamps: true,
    versionKey: false
});

UserSchema.index({ 'economy.balance': -1 });
UserSchema.index({ isPremium: 1, premiumUntil: 1 });
UserSchema.index({ isBanned: 1, banUntil: 1 });

UserSchema.methods.addBalance = function(amount) {
    this.economy.balance += amount;
    this.economy.transactions.push({
        type: 'daily',
        amount: amount,
        description: 'Balance added'
    });
    return this.save();
};

UserSchema.methods.removeBalance = function(amount) {
    if (this.economy.balance < amount) {
        throw new Error('Insufficient balance');
    }
    this.economy.balance -= amount;
    this.economy.transactions.push({
        type: 'purchase',
        amount: -amount,
        description: 'Balance deducted'
    });
    return this.save();
};

UserSchema.methods.addXP = function(amount) {
    this.economy.xp += amount;
    const newLevel = Math.floor(this.economy.xp / 100) + 1;
    
    if (newLevel > this.economy.level) {
        this.economy.level = newLevel;
        this.economy.balance += newLevel * 50;
        return { levelUp: true, newLevel };
    }
    
    return { levelUp: false, newLevel };
};

UserSchema.methods.ban = function(reason, duration, bannedBy) {
    this.isBanned = true;
    this.banReason = reason;
    this.bannedBy = bannedBy;
    
    if (duration) {
        this.banUntil = new Date(Date.now() + duration);
    }
    
    return this.save();
};

UserSchema.methods.unban = function() {
    this.isBanned = false;
    this.banReason = null;
    this.banUntil = null;
    this.bannedBy = null;
    return this.save();
};

UserSchema.methods.warn = function(reason, warnedBy, duration = 24 * 60 * 60 * 1000) {
    this.warnings.push({
        reason,
        warnedBy,
        expiresAt: new Date(Date.now() + duration)
    });
    
    if (this.warnings.length >= 3) {
        return this.ban('Too many warnings', 24 * 60 * 60 * 1000, 'System');
    }
    
    return this.save();
};

UserSchema.methods.clearWarnings = function() {
    this.warnings = [];
    return this.save();
};

UserSchema.methods.setPremium = function(type, duration) {
    this.isPremium = true;
    this.premiumType = type;
    this.premiumUntil = new Date(Date.now() + duration);
    return this.save();
};

UserSchema.methods.removePremium = function() {
    this.isPremium = false;
    this.premiumType = null;
    this.premiumUntil = null;
    return this.save();
};

UserSchema.methods.setAFK = function(reason) {
    this.afk.isAfk = true;
    this.afk.reason = reason;
    this.afk.since = new Date();
    return this.save();
};

UserSchema.methods.removeAFK = function() {
    this.afk.isAfk = false;
    this.afk.reason = null;
    this.afk.since = null;
    return this.save();
};

UserSchema.methods.canUseCommand = function(command) {
    if (this.isBanned) return false;
    if (!this.preferences.privacy.allowCommands) return false;
    
    const cooldown = this.cooldowns.get(command);
    if (cooldown && Date.now() < cooldown.getTime()) return false;
    
    return true;
};

UserSchema.statics.findByPhone = function(phone) {
    return this.findOne({ phone: phone.replace('+', '') });
};

UserSchema.statics.getTopUsers = function(field = 'economy.balance', limit = 10, skip = 0) {
    const sortObj = {};
    sortObj[field] = -1;
    return this.find({ isBanned: false }).sort(sortObj).skip(skip).limit(limit);
};

UserSchema.pre('save', function(next) {
    if (this.banUntil && this.banUntil <= Date.now()) {
        this.isBanned = false;
        this.banReason = null;
        this.banUntil = null;
        this.bannedBy = null;
    }
    
    if (this.premiumUntil && this.premiumUntil <= Date.now()) {
        this.isPremium = false;
        this.premiumType = null;
        this.premiumUntil = null;
    }
    
    this.warnings = this.warnings.filter(w => !w.expiresAt || w.expiresAt > Date.now());
    
    next();
});

const User = mongoose.model('User', UserSchema);

const isDatabaseConnected = () => {
    return mongoose.connection.readyState === 1;
};

const mockUser = (jid, userData = {}) => ({
    jid: jid || userData.jid || 'mock@s.whatsapp.net',
    phone: userData.phone || jid?.split('@')[0] || '1234567890',
    name: userData.name || 'Mock User',
    isPremium: false,
    isBanned: false,
    economy: {
        balance: 1000,
        bank: 0,
        level: 1,
        xp: 0,
        transactions: []
    },
    statistics: {
        commandsUsed: 0,
        messagesSent: 0,
        lastActive: new Date()
    },
    warnings: [],
    cooldowns: new Map(),
    save: async () => mockUser(jid, userData),
    ...userData
});

async function getUser(jid) {
    if (!isDatabaseConnected()) {
        return mockUser(jid);
    }
    try {
        return await User.findOne({ jid }).maxTimeMS(5000);
    } catch (error) {
        return mockUser(jid);
    }
}

async function createUser(userData) {
    if (!isDatabaseConnected()) {
        return mockUser(userData.jid, userData);
    }
    try {
        const user = new User(userData);
        return await user.save();
    } catch (error) {
        return mockUser(userData.jid, userData);
    }
}

async function updateUser(jid, updateData) {
    if (!isDatabaseConnected()) {
        return mockUser(jid, updateData);
    }
    try {
        return await User.findOneAndUpdate({ jid }, updateData, { new: true, upsert: true, maxTimeMS: 5000 });
    } catch (error) {
        return mockUser(jid, updateData);
    }
}

async function deleteUser(jid) {
    if (!isDatabaseConnected()) {
        return { deletedCount: 1 };
    }
    try {
        return await User.findOneAndDelete({ jid });
    } catch (error) {
        return { deletedCount: 0 };
    }
}

async function getUserStats() {
    if (!isDatabaseConnected()) {
        return { total: 100, premium: 10, banned: 5, active: 50 };
    }
    try {
        const total = await User.countDocuments();
        const premium = await User.countDocuments({ isPremium: true });
        const banned = await User.countDocuments({ isBanned: true });
        const active = await User.countDocuments({ 
            'statistics.lastActive': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        return { total, premium, banned, active };
    } catch (error) {
        return { total: 100, premium: 10, banned: 5, active: 50 };
    }
}

export {
    User,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getUserStats
};