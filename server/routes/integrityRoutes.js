const express = require('express');
const router = express.Router();
const User = require('../models/User');
const IntegrityLog = require('../models/IntegrityLog');
const Match = require('../models/Match');
const { protect, admin } = require('../middleware/authMiddleware');

const { getIntegrityCache, setIntegrityCache, invalidateIntegrityCache } = require('../utils/cache');

// @desc    Get Integrity Overview
// @route   GET /api/v1/integrity/overview
// @access  Private/Admin
router.get('/overview', protect, admin, async (req, res) => {
    try {
        const now = Date.now();
        const cache = getIntegrityCache();
        if (cache.data && now < cache.expiry && Object.keys(req.query).length === 0) {
            return res.json(cache.data);
        }

        const { startDate, endDate } = req.query;

        // Base filters
        let logFilter = {};
        let matchFilter = { status: 'completed', prediction: { $exists: true } };

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            logFilter.createdAt = { $gte: start, $lte: end };
            matchFilter.endTime = { $gte: start, $lte: end };
        }

        // 1. Summaries
        const [totalFlagged, activeInvestigations, avgStats] = await Promise.all([
            User.countDocuments({ 'integrity.isFlagged': true }),
            User.countDocuments({ 'integrity.status': 'under_review' }),
            User.aggregate([
                { $group: { _id: null, avgScore: { $avg: "$integrity.suspicionScore" } } }
            ])
        ]);

        // 2. Highest Suspicion Scores
        const topSuspected = await User.find({})
            .sort({ 'integrity.suspicionScore': -1 })
            .limit(10)
            .select('username integrity stats');

        // 3. Recent 20 Logs
        const recentLogs = await IntegrityLog.find(logFilter)
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('user', 'username email integrity')
            .populate('match', 'score tournament');

        // 4. Average Upset Probability (last 50 matches)
        const recentMatches = await Match.find(matchFilter)
            .sort({ endTime: -1 })
            .limit(50);

        let totalProb = 0;
        let pCount = 0;

        recentMatches.forEach(m => {
            if (m.prediction && m.winner && m.participants.length >= 2) {
                const isP1Winner = m.participants[0].equals(m.winner);
                const prob = isP1Winner ? m.prediction.win_probability : (1 - m.prediction.win_probability);
                totalProb += prob;
                pCount++;
            }
        });

        const avgUpsetProb = pCount > 0 ? (totalProb / pCount) : 0;

        const result = {
            summary: {
                totalFlagged,
                activeInvestigations,
                avgSuspicionScore: avgStats[0]?.avgScore || 0,
                avgUpsetProb: (avgUpsetProb * 100).toFixed(1)
            },
            topSuspected,
            recentLogs
        };

        // Cache only if no filters
        if (Object.keys(req.query).length === 0) {
            setIntegrityCache(result, 60000);
        }

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Update Integrity Status
// @route   PUT /api/v1/integrity/status/:userId
// @access  Private/Admin
router.put('/status/:userId', protect, admin, async (req, res) => {
    try {
        const { status, suspicionScore } = req.body;
        const user = await User.findById(req.params.userId);

        if (!user) return res.status(404).json({ message: 'User not found' });

        if (status) user.integrity.status = status;
        if (suspicionScore !== undefined) user.integrity.suspicionScore = suspicionScore;

        // Auto-sync isFlagged
        if (status === 'flagged') {
            user.integrity.isFlagged = true;
        } else if (status === 'cleared' || status === 'none') {
            user.integrity.isFlagged = false;
        }

        await user.save();

        // Invalidate cache
        invalidateIntegrityCache();

        res.json(user.integrity);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
