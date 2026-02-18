const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');
const { protect, organizer } = require('../middleware/authMiddleware');
const { updateRankings } = require('../services/rankingService');
const { getPrediction } = require('../services/aiService');
const { analyzeMatchIntegrity } = require('../services/integrityService');
const AuditLog = require('../models/AuditLog');

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

        res.json(match);
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

        // Helper to safely get specific game stats or fallback
        // Since getGameStats is not exported from rankingService (wait, need to check if it is or duplicate logic)
        // Actually, checking rankingService.js again, getGameStats is NOT exported currently.
        // It says "module.exports = { updateRankings };"
        // So I must implement the stats extraction logic here or modify rankingService to export it.
        // The prompt says "Do NOT modify rankingService".
        // So I will duplicate the stats extraction logic.

        const getStats = (user, gId) => {
            return user.gameStats?.get(gId) || {
                rankPoints: 1000,
                wins: 0,
                losses: 0,
                matchesPlayed: 0
            };
        };

        const p1Stats = getStats(p1, gameId);
        const p2Stats = getStats(p2, gameId);

        const p1WinRate = p1Stats.matchesPlayed > 0 ? (p1Stats.wins / p1Stats.matchesPlayed) : 0.5; // Default if no games
        const p2WinRate = p2Stats.matchesPlayed > 0 ? (p2Stats.wins / p2Stats.matchesPlayed) : 0.5;

        // Call AI Service
        const prediction = await getPrediction(
            { rating: p1Stats.rankPoints, winRate: p1WinRate, id: p1._id },
            { rating: p2Stats.rankPoints, winRate: p2WinRate, id: p2._id },
            { type: game.name }
        );

        if (!prediction) {
            // Graceful fallback: return null or simple 50/50
            return res.status(200).json(null);
        }

        // Log Prediction for Analytics
        // Using AuditLog is requested.
        // We might not have req.user if public, but usually AuditLog needs a user.
        // If req.user exists, use it. Else system.
        if (req.user) {
            await AuditLog.create({
                user: req.user._id,
                action: 'MATCH_PREDICTION',
                resourceType: 'Match',
                resourceId: match._id,
                details: { prediction },
                ip: req.ip
            });
        }

        res.json({
            ...prediction,
            playerA: { id: p1._id, winRate: p1WinRate, rating: p1Stats.rankPoints },
            playerB: { id: p2._id, winRate: p2WinRate, rating: p2Stats.rankPoints }
        });

    } catch (err) {
        console.error(`[PREDICTION ERROR] ${err.message}`);
        res.status(500).json({ message: 'Prediction service unavailable' });
    }
});

// Import Validation Service
const { validateMatchResult } = require('../services/matchValidationService');

// @desc    Submit Match Result (Step 1)
// @route   POST /api/matches/:id/result
// @access  Private
router.post('/:id/result', protect, async (req, res) => {
    const { replayLink, ...submissionData } = req.body;
    const io = require('../socket').getIO();
    console.log(`[MATCH] Result submission attempt for ${req.params.id} by ${req.user.username}`);

    try {
        // Deep populate to get game rules
        const match = await Match.findById(req.params.id)
            .populate({
                path: 'tournament',
                populate: { path: 'game' }
            });

        if (!match) return res.status(404).json({ message: 'Match not found' });

        if (match.status === 'completed' || match.verificationStatus === 'verified') {
            return res.status(400).json({ message: 'Match is already completed/verified' });
        }

        // Prevent overwriting if already pending (unless organizer override)
        if (match.verificationStatus === 'pending' && match.submittedBy && String(match.submittedBy) !== String(req.user._id)) {
            return res.status(409).json({ message: 'Result already submitted. Please confirm or dispute instead.' });
        }

        const isParticipant = match.participants.includes(req.user._id);
        const isOrganizer = req.user.role === 'organizer' || req.user.role === 'admin';

        if (!isParticipant && !isOrganizer) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Validate Result based on Game Type
        const game = match.tournament?.game;
        let validatedResult;

        try {
            // Organizer can override validation if needed, but safer to validate
            // For now, always validate
            validatedResult = validateMatchResult(game, match.participants.map(p => p.toString()), submissionData);
        } catch (validationErr) {
            return res.status(400).json({ message: `Invalid Result: ${validationErr.message}` });
        }

        match.winner = validatedResult.winner;
        match.score = validatedResult.score;
        match.result = validatedResult.result; // Store structured data
        match.replayLink = replayLink;
        match.submittedBy = req.user._id;

        if (isOrganizer) {
            match.verificationStatus = 'verified';
            match.status = 'completed';
            match.endTime = new Date();
            await updateRankings(match._id);
            // Run Integrity Analysis (Async - don't block response)
            analyzeMatchIntegrity(match._id);
            console.log(`[MATCH] Organizer verified match ${match._id}`);
        } else {
            match.verificationStatus = 'pending';
            match.status = 'ongoing';
            console.log(`[MATCH] Player submitted pending result for match ${match._id}`);
        }

        const AuditLog = require('../models/AuditLog');

        // ... (existing update logic)

        await match.save();

        // Create Audit Log
        await AuditLog.create({
            user: req.user._id,
            action: isOrganizer ? 'MATCH_VERIFIED_OVERRIDE' : 'MATCH_SUBMISSION',
            resourceType: 'Match',
            resourceId: match._id,
            details: { winnerId, score, replayLink },
            ip: req.ip
        });

        io.to(`match_${match._id}`).emit('match_update', match);
        io.emit('tournament_update', { tournamentId: match.tournament, matchId: match._id });

        res.json(match);
    } catch (err) {
        console.error(`[MATCH] Error in result submission: ${err.message}`);
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
        // Run Integrity Analysis (Async - don't block response)
        analyzeMatchIntegrity(match._id);
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
