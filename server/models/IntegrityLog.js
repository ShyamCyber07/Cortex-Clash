const mongoose = require('mongoose');

const integrityLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
    reason: { type: String, required: true }, // e.g., "Low Probability Win", "Win Streak Anomaly"
    scoreDelta: { type: Number, required: true },
    details: { type: mongoose.Schema.Types.Mixed }, // Snapshot of stats/prediction
    createdAt: { type: Date, default: Date.now }
});

integrityLogSchema.index({ user: 1 });
integrityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('IntegrityLog', integrityLogSchema);
