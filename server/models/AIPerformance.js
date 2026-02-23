const mongoose = require('mongoose');

const aiPerformanceSchema = new mongoose.Schema({
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, unique: true },
    predictedWinner: { type: String, enum: ['p1', 'p2'], required: true },
    winProbability: { type: Number, required: true },
    actualWinner: { type: String, enum: ['p1', 'p2'], required: true },
    isCorrect: { type: Boolean, required: true },
    brierScore: { type: Number, required: true },
    confidenceDifference: { type: Number, required: true }
}, { timestamps: true });

// Index for getting last 100 matches quickly
aiPerformanceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AIPerformance', aiPerformanceSchema);
