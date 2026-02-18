const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');
const { protect } = require('../middleware/authMiddleware');

// @desc    Get Player Analytics
// @route   GET /api/analytics/player/:id
// @access  Private
router.get('/player/:id', protect, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate({
                path: 'matchHistory',
                populate: { path: 'participants winner tournament', select: 'username name' },
                options: { sort: { createdAt: -1 }, limit: 10 } // Last 10 matches
            });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Calculate Win Rate
        const totalMatches = user.stats.matchesPlayed;
        const winRate = totalMatches > 0 ? ((user.stats.wins / totalMatches) * 100).toFixed(1) : 0;

        // Process Elo History for Chart (Dates formatted)
        const eloChartData = user.stats.eloHistory.map(entry => ({
            date: new Date(entry.date).toLocaleDateString(),
            rating: entry.rating
        }));

        // Resolve Game Stats with Names
        const gameStatsObj = {};
        if (user.gameStats && user.gameStats.size > 0) {
            const Game = require('../models/Game');
            const gameIds = Array.from(user.gameStats.keys());
            const games = await Game.find({ _id: { $in: gameIds } }).select('name icon scoringType');

            games.forEach(g => {
                const stats = user.gameStats.get(g._id.toString());
                if (stats) {
                    gameStatsObj[g._id] = {
                        ...stats,
                        gameName: g.name,
                        gameIcon: g.icon,
                        scoringType: g.scoringType
                    };
                }
            });
        }

        res.json({
            stats: {
                currentElo: user.stats.rankPoints,
                wins: user.stats.wins,
                losses: user.stats.losses,
                winRate: winRate,
                consistency: user.stats.consistency,
                matchesPlayed: totalMatches
            },
            gameStats: gameStatsObj, // structured game stats
            eloHistory: eloChartData,
            recentMatches: user.matchHistory
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get Tournament Analytics
// @route   GET /api/analytics/tournament/:id
// @access  Private
router.get('/tournament/:id', protect, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id)
            .populate({
                path: 'matches',
                populate: { path: 'participants' }
            });

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        const matches = tournament.matches;
        const totalMatches = matches.length;
        const completedMatches = matches.filter(m => m.status === 'completed').length;
        const completionPercentage = totalMatches > 0 ? ((completedMatches / totalMatches) * 100).toFixed(1) : 0;

        // Calculate Competitiveness (Avg Elo Diff)
        let totalEloDiff = 0;
        let diffCount = 0;

        matches.forEach(match => {
            if (match.participants.length === 2 && match.participants[0].stats && match.participants[1].stats) {
                const diff = Math.abs(match.participants[0].stats.rankPoints - match.participants[1].stats.rankPoints);
                totalEloDiff += diff;
                diffCount++;
            }
        });

        const avgEloDiff = diffCount > 0 ? (totalEloDiff / diffCount).toFixed(0) : 0;

        // Competitiveness Score (Inverse of Diff, normalized roughly)
        // e.g. Diff 0 = 100%, Diff 400 = 0%
        let competitivenessScore = Math.max(0, 100 - (avgEloDiff / 4));

        res.json({
            progress: {
                total: totalMatches,
                completed: completedMatches,
                percentage: completionPercentage
            },
            metrics: {
                avgEloDiff,
                competitivenessScore: competitivenessScore.toFixed(1),
                participantCount: tournament.participants.length
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
