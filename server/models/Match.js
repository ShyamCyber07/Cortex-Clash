const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
    round: { type: Number },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: { type: String }, // Display summary e.g. "2-1" or "13-11"
    result: { type: mongoose.Schema.Types.Mixed }, // Structured data: { team1: 13, team2: 11 } or [{ playerId, rank, kills }]
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verificationStatus: { type: String, enum: ['pending', 'verified', 'disputed'], default: 'pending' },
    status: { type: String, enum: ['scheduled', 'ongoing', 'completed', 'disputed'], default: 'scheduled' }, // 'disputed' is good for organizers
    replayLink: { type: String },
    startTime: { type: Date },
    endTime: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
