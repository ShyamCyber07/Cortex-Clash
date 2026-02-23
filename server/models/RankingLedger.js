const mongoose = require('mongoose');

const rankingLedgerSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true }
}, { timestamps: true });

// Enforce single ranking update per match per user
rankingLedgerSchema.index({ user: 1, match: 1 }, { unique: true });

module.exports = mongoose.model('RankingLedger', rankingLedgerSchema);
