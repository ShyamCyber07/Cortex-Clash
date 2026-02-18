const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['player', 'organizer', 'admin'], default: 'player' },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    stats: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        rankPoints: { type: Number, default: 1000 },
        matchesPlayed: { type: Number, default: 0 },
        consistency: { type: Number, default: 0 },
        eloHistory: [{
            rating: Number,
            date: { type: Date, default: Date.now }
        }]
    },
    // Game-specific stats: { [gameId]: { rankPoints, wins, losses, matchesPlayed, ... } }
    gameStats: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    // Season-specific stats: { [seasonId]: { [gameId]: { rankPoints, wins, ... } } }
    seasonStats: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    matchHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
    // Integrity System
    integrity: {
        suspicionScore: { type: Number, default: 0 },
        isFlagged: { type: Boolean, default: false },
        lastFlaggedAt: { type: Date },
        winStreak: { type: Number, default: 0 } // Helper for anomaly detection
    }
}, { timestamps: true });

// Password hash middleware
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
