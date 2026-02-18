const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Game = require('../models/Game');

// @desc    Get Global Leaderboard
// @route   GET /api/v1/leaderboard
// @access  Public
router.get('/', async (req, res) => {
    try {
        const users = await User.find()
            .sort({ 'stats.rankPoints': -1 })
            .limit(100)
            .select('username avatar stats');

        const leaderboard = users.map((user, index) => ({
            rank: index + 1,
            _id: user._id,
            username: user.username,
            avatar: user.avatar,
            rating: user.stats.rankPoints,
            wins: user.stats.wins,
            losses: user.stats.losses,
            matchesPlayed: user.stats.matchesPlayed,
            winRate: user.stats.matchesPlayed > 0
                ? Math.round((user.stats.wins / user.stats.matchesPlayed) * 100)
                : 0
        }));

        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get Game-Specific Leaderboard
// @route   GET /api/v1/leaderboard/:gameId
// @access  Public
router.get('/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        const game = await Game.findById(gameId);

        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        // Fetch users who have stats for this game
        // Note: Querying Maps in Mongo can be tricky.
        // We look for documents where the specific map key exists.
        // Also need to project just what we need.
        const users = await User.find({
            [`gameStats.${gameId}`]: { $exists: true }
        }).lean(); // Use lean for performance and easier map access

        // Manually process and sort in memory (since Map values inside Mixed type are hard to sort in Mongo without Aggregation)
        // For a large scale app, Aggregation Pipeline $objectToArray is needed.
        // For now, in-memory sort is fine for MVP ~1000 users.

        const leaderboard = users
            .map(user => {
                const stats = user.gameStats[gameId];
                return {
                    _id: user._id,
                    username: user.username,
                    avatar: user.avatar,
                    rating: stats.rankPoints || 1000,
                    wins: stats.wins || 0,
                    losses: stats.losses || 0,
                    matchesPlayed: stats.matchesPlayed || 0,
                    winRate: (stats.matchesPlayed || 0) > 0
                        ? Math.round((stats.wins / stats.matchesPlayed) * 100)
                        : 0
                };
            })
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 100) // Top 100
            .map((entry, index) => ({ ...entry, rank: index + 1 }));

        res.json({
            gameName: game.name,
            leaderboard
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
