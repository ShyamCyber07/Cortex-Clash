const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    icon: { type: String }, // URL or identifier for the frontend
    banner: { type: String }, // Hero image for tournament pages
    supportedFormats: [{
        type: String,
        enum: ['1v1', '2v2', '3v3', '4v4', '5v5', 'Battle Royale']
    }],
    scoringType: {
        type: String,
        enum: ['round-based', 'points-based', 'win-loss'],
        default: 'win-loss'
    },
    maxPlayersPerTeam: { type: Number, default: 1 },
    defaultRules: { type: String },
    enabled: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Game', gameSchema);
