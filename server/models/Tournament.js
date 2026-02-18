const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
    // gameType maps to the specific format selected for this tournament (e.g. '5v5')
    matchFormat: { type: String, required: true },
    format: { type: String, enum: ['single-elimination', 'round-robin', 'double-elimination'], default: 'single-elimination' },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
    maxParticipants: { type: Number, default: 64 },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
    season: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' }, // The season this tournament belongs to
    startDate: { type: Date },
    endDate: { type: Date },
    rules: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Tournament', tournamentSchema);
