const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
    round: { type: Number },
    teamA: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    teamB: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    score: { type: String }, // Display summary e.g. "2-1" or "13-11"
    result: { type: mongoose.Schema.Types.Mixed }, // Structured data: { team1: 13, team2: 11 } or [{ playerId, rank, kills }]
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verificationStatus: { type: String, enum: ['pending', 'verified', 'disputed'], default: 'pending' },
    status: { type: String, enum: ['scheduled', 'completed'], default: 'scheduled' }, // 'disputed' is good for organizers
    replayLink: { type: String },
    prediction: { type: mongoose.Schema.Types.Mixed }, // Cached AI Prediction
    mlPrediction: {
        win_probability: { type: Number },
        confidence_score: { type: Number },
        predicted_winner: { type: String, enum: ['p1', 'p2'] }, // Indicates which participant index won
        risk_level: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
        is_fallback: { type: Boolean, default: false }
    },
    startTime: { type: Date },
    endTime: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
