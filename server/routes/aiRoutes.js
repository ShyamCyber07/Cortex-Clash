const express = require('express');
const router = express.Router();
const AIPerformance = require('../models/AIPerformance');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get AI metrics over the last 100 matches
// @route   GET /api/v1/ai/metrics
// @access  Private/Admin
router.get('/metrics', protect, admin, async (req, res) => {
    try {
        const historyLimit = 100;
        const recentPerformances = await AIPerformance.find({})
            .sort({ createdAt: -1 })
            .limit(historyLimit);

        if (recentPerformances.length === 0) {
            return res.json({
                totalAnalyzed: 0,
                accuracy: 0,
                avgBrierScore: 0,
                avgConfidence: 0,
                history: []
            });
        }

        let correctPredictions = 0;
        let totalBrierScore = 0;
        let totalWinProbability = 0;

        recentPerformances.forEach(p => {
            if (p.isCorrect) correctPredictions++;
            totalBrierScore += p.brierScore;
            totalWinProbability += p.winProbability;
        });

        const totalAnalyzed = recentPerformances.length;
        const accuracy = (correctPredictions / totalAnalyzed) * 100;
        const avgBrierScore = totalBrierScore / totalAnalyzed;
        const avgConfidence = (totalWinProbability / totalAnalyzed) * 100;

        res.json({
            totalAnalyzed,
            accuracy: accuracy.toFixed(2),
            avgBrierScore: avgBrierScore.toFixed(4),
            avgConfidence: avgConfidence.toFixed(2),
            history: recentPerformances
        });

    } catch (err) {
        console.error(`[AI ROUTES] Error fetching metrics: ${err.message}`);
        res.status(500).json({ message: 'Error fetching AI metrics' });
    }
});

module.exports = router;
