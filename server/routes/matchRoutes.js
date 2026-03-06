const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');
const { protect, organizer } = require('../middleware/authMiddleware');
const { updateRankings, getGameStats } = require('../services/rankingService');
const { getPrediction, recordMatchPredictionResult } = require('../services/aiService');
const AuditLog = require('../models/AuditLog');
const { integrityQueue, aiMetricsQueue, tournamentQueue } = require('../config/queue');

// @desc    Get match by ID
// @route   GET /api/matches/:id
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id)
            .populate('participants', 'username avatar stats')
            .populate('winner', 'username')
            .populate({
                path: 'tournament',
                select: 'name game',
                populate: { path: 'game' }
            });

        if (!match) return res.status(404).json({ message: 'Match not found' });

        let responseObj = match.toJSON();

        // Flatten ML predictions onto root response object
        if (responseObj.mlPrediction) {
            responseObj = {
                ...responseObj,
                win_probability: responseObj.mlPrediction.win_probability,
                confidence_score: responseObj.mlPrediction.confidence_score,
                predicted_winner: responseObj.mlPrediction.predicted_winner,
                risk_level: responseObj.mlPrediction.risk_level,
                is_fallback: responseObj.mlPrediction.is_fallback
            };
        }

        res.json(responseObj);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get match prediction
// @route   GET /api/matches/:id/prediction
// @access  Public (or Protected)
router.get('/:id/prediction', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id)
            .populate('participants')
            .populate({
                path: 'tournament',
                populate: { path: 'game' }
            });

        if (!match) return res.status(404).json({ message: 'Match not found' });

        // Ensure we have enough participants (usually 2 for prediction)
        if (match.participants.length < 2) {
            return res.status(400).json({ message: 'Not enough players for prediction' });
        }

        const p1 = match.participants[0];
        const p2 = match.participants[1];
        const game = match.tournament?.game;

        if (!game) return res.status(400).json({ message: 'Game data not found' });

        const gameId = game._id.toString();

        if (match.mlPrediction && match.mlPrediction.win_probability !== undefined) {
            return res.json(match.mlPrediction);
        }

        const p1Stats = getGameStats(p1, gameId);
        const p2Stats = getGameStats(p2, gameId);

        const p1WinRate = (p1Stats.wins / (p1Stats.matchesPlayed || 1));
        const p2WinRate = (p2Stats.wins / (p2Stats.matchesPlayed || 1));

        // Call our unified ML Service
        const { getMLPredictionRaw } = require('../utils/mlService');
        const prediction = await getMLPredictionRaw(
            p1Stats.rankPoints || 1000,
            p2Stats.rankPoints || 1000,
            p1WinRate,
            p2WinRate
        );

        if (!prediction) {
            return res.status(500).json({ message: 'Prediction unresolvable' });
        }

        const predictionData = {
            win_probability: prediction.win_probability,
            confidence_score: prediction.confidence_score,
            predicted_winner: prediction.predicted_winner,
            risk_level: prediction.risk_level,
            is_fallback: prediction.is_fallback,
            playerA: { id: p1._id, winRate: p1WinRate, rating: p1Stats.rankPoints },
            playerB: { id: p2._id, winRate: p2WinRate, rating: p2Stats.rankPoints }
        };

        // Cache the prediction on the Match Model
        match.mlPrediction = predictionData;
        await match.save();

        // Log Prediction for Analytics
        if (req.user) {
            await AuditLog.create({
                user: req.user._id,
                action: 'MATCH_PREDICTION',
                resourceType: 'Match',
                resourceId: match._id,
                details: { prediction: predictionData },
                ip: req.ip
            });
        }

        res.json(predictionData);

    } catch (err) {
        console.error(`[PREDICTION ERROR] ${err.message}`);
        res.status(500).json({ message: 'Prediction service unavailable' });
    }
});

// Import Validation Service
const { validateMatchResult } = require('../services/matchValidationService');

// @desc    Submit Match Result
// @route   POST /api/matches/:id/result
// @access  Private
router.post('/:id/result', protect, async (req, res) => {
    try {
        const { winnerTeamId } = req.body;

        const match = await Match.findById(req.params.id);
        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }

        const teamAId = match.teamA ? match.teamA.toString() : null;
        const teamBId = match.teamB ? match.teamB.toString() : null;

        if (winnerTeamId !== teamAId && winnerTeamId !== teamBId) {
            return res.status(400).json({ message: 'winnerTeamId must belong to either teamA or teamB of this match' });
        }

        match.status = 'completed';
        match.winner = winnerTeamId;

        await match.save();

        res.status(200).json(match);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Confirm Match Result (Step 2)
// @route   POST /api/matches/:id/confirm
// @access  Private (Opponent Only)
router.post('/:id/confirm', protect, async (req, res) => {
    const io = require('../socket').getIO();
    console.log(`[MATCH] Confirmation attempt for ${req.params.id} by ${req.user.username}`);

    try {
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ message: 'Match not found' });

        if (match.verificationStatus === 'verified' || match.status === 'completed') {
            return res.status(200).json(match); // Idempotent success
        }

        if (match.verificationStatus !== 'pending') {
            return res.status(400).json({ message: 'Match is not pending confirmation' });
        }

        // Must be the OTHER participant
        const isOpponent = match.participants.includes(req.user._id) && String(match.submittedBy) !== String(req.user._id);
        const isOrganizer = req.user.role === 'organizer' || req.user.role === 'admin';

        if (!isOpponent && !isOrganizer) {
            console.warn(`[MATCH] Unauthorized confirmation attempt for ${req.params.id}`);
            return res.status(401).json({ message: 'Not authorized to confirm this result' });
        }

        match.verificationStatus = 'verified';
        match.status = 'completed';
        match.endTime = new Date();

        const AuditLog = require('../models/AuditLog');

        await match.save();
        await updateRankings(match._id);
        // Run Integrity & Analytics & Automation (Dispatched to BullMQ)
        await integrityQueue.add('analyze-match', { matchId: match._id });
        await aiMetricsQueue.add('record-prediction', { matchId: match._id });
        await tournamentQueue.add('advance-bracket', { matchId: match._id });
        console.log(`[MATCH] Match ${match._id} verified and completed`);

        // Create Audit Log
        await AuditLog.create({
            user: req.user._id,
            action: 'MATCH_CONFIRMATION',
            resourceType: 'Match',
            resourceId: match._id,
            ip: req.ip
        });

        io.to(`match_${match._id}`).emit('match_update', match);
        io.emit('tournament_update', { tournamentId: match.tournament, matchId: match._id });

        res.json(match);
    } catch (err) {
        console.error(`[MATCH] Error in confirmation: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
});

// @desc    Dispute Match Result
// @route   POST /api/matches/:id/dispute
// @access  Private
router.post('/:id/dispute', protect, async (req, res) => {
    const io = require('../socket').getIO();
    try {
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ message: 'Match not found' });

        match.verificationStatus = 'disputed';
        match.status = 'disputed';
        await match.save();

        io.to(`match_${match._id}`).emit('match_update', match);

        res.json(match);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
