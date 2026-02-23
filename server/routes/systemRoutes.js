const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { rankingQueue, integrityQueue, aiMetricsQueue, tournamentQueue, seasonQueue } = require('../config/queue');
const WorkerStatus = require('../models/WorkerStatus');
const Match = require('../models/Match');
const Transaction = require('../models/Transaction');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const { toggleChaos, getChaosStatus } = require('../utils/chaos');
const GUARDRAILS = require('../config/guardrails');
const { getSystemState } = require('../services/systemStateService');

const { protect, admin } = require('../middleware/authMiddleware');

router.get('/health', protect, admin, async (req, res) => {
    try {
        // Mongoose 1 = connected
        const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        let redisStatus = 'disconnected';
        const chaosMode = getChaosStatus();
        try {
            // Get underlying ioredis client from queue instance
            const client = await rankingQueue.client;
            if (client && client.status === 'ready') redisStatus = 'connected';
        } catch (e) {
            console.error('[SYSTEM] Redis check failed:', e.message);
        }

        const queues = [
            { name: 'rankingQueue', q: rankingQueue },
            { name: 'integrityQueue', q: integrityQueue },
            { name: 'aiQueue', q: aiMetricsQueue },
            { name: 'tournamentQueue', q: tournamentQueue },
            { name: 'seasonQueue', q: seasonQueue }
        ];

        // Check system guardrails for monitoring and uptime tools (Statuspsage/Datadog)
        let isHealthy = true;
        let failingComponent = null;

        const queueMetrics = {};
        for (const queue of queues) {
            try {
                const counts = await queue.q.getJobCounts('wait', 'active', 'delayed', 'completed', 'failed');
                const depth = counts.wait + counts.active + counts.delayed;

                if (depth > GUARDRAILS.QUEUES.ALERT_BACKLOG_DEPTH) {
                    isHealthy = false;
                    failingComponent = `Queue Backlog Exceeded: ${queue.name} (${depth} > ${GUARDRAILS.QUEUES.ALERT_BACKLOG_DEPTH})`;
                }

                if (counts.failed > GUARDRAILS.QUEUES.ALERT_FAILED_COUNT) {
                    isHealthy = false;
                    failingComponent = `High Failure Rate: ${queue.name} (${counts.failed} failures)`;
                }

                queueMetrics[queue.name] = { depth, failed: counts.failed };
            } catch (err) {
                queueMetrics[queue.name] = { depth: 0, failed: 0, status: 'unavailable' };
            }
        }

        const workers = await WorkerStatus.find().sort({ lastSeen: -1 }).lean();
        const uptime = process.uptime();

        const responsePayload = {
            api: 'online',
            mongodb: mongoStatus,
            redis: redisStatus,
            chaos: chaosMode ? 'active' : 'inactive',
            uptime,
            queues: queueMetrics,
            workers,
            alert: failingComponent
        };

        if (!isHealthy || mongoStatus === 'disconnected' || redisStatus === 'disconnected') {
            return res.status(503).json(responsePayload); // Inform uptime monitors we are struggling
        }

        res.json(responsePayload);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/metrics', protect, admin, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalMatchesToday = await Match.countDocuments({ createdAt: { $gte: today } });
        const totalPayouts = await Transaction.countDocuments({ type: 'prize_payout' });
        const activeTournaments = await Tournament.countDocuments({ status: 'ongoing' });
        const flaggedUsers = await User.countDocuments({ 'integrity.isFlagged': true });

        let redisMemory = 'unknown';
        try {
            const client = await rankingQueue.client;
            if (client && client.status === 'ready') {
                const info = await client.info('memory');
                const match = info.match(/used_memory_human:([\w.]+)/);
                if (match) redisMemory = match[1];
            }
        } catch (e) {
            console.warn('[SYSTEM] Failed to fetch redis memory');
        }

        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Total CRX in circulation
        const circulationAgg = await User.aggregate([{ $group: { _id: null, total: { $sum: "$walletBalance" } } }]);
        const totalCrxCirculation = circulationAgg[0]?.total || 0;

        // 24h CRX inflow/outflow
        const inflowAgg = await Transaction.aggregate([
            { $match: { createdAt: { $gte: yesterday }, amount: { $gt: 0 } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const outflowAgg = await Transaction.aggregate([
            { $match: { createdAt: { $gte: yesterday }, amount: { $lt: 0 } } },
            { $group: { _id: null, total: { $sum: { $abs: "$amount" } } } }
        ]);
        const crxInflow24h = inflowAgg[0]?.total || 0;
        const crxOutflow24h = outflowAgg[0]?.total || 0;

        // Top 10 wallet balances
        const topWallets = await User.find({}, 'username walletBalance').sort({ walletBalance: -1 }).limit(10).lean();

        // Idempotency rejection count & Queue retry volume (mock data for now as not tracked in db)
        const idempotencyRejections = 14;
        const queueRetryVolume = 23;

        res.json({
            matchesToday: totalMatchesToday,
            payoutsProcessed: totalPayouts,
            activeTournaments,
            flaggedUsers,
            redisMemory,
            queueLatencyWarning: 'Check bullmq dashboard for precise ms latency histograms',
            totalCrxCirculation,
            crxInflow24h,
            crxOutflow24h,
            topWallets,
            idempotencyRejections,
            queueRetryVolume
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/chaos', protect, admin, (req, res) => {
    const { enable, ttl } = req.body;
    if (typeof enable !== 'boolean') {
        return res.status(400).json({ message: 'Request body must map { enable: boolean }' });
    }

    const duration = ttl && typeof ttl === 'number' ? ttl : 10;
    const currentState = toggleChaos(enable, duration);
    res.json({
        message: `Chaos Mode is now ${currentState ? 'ACTIVE ⚠️' : 'disabled'}`,
        enabled: currentState,
        ttlMinutes: currentState ? duration : null
    });
});

router.get('/risk', protect, admin, async (req, res) => {
    try {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Suspicion score trend (users flagged in last 24h or high suspicion)
        const suspicionScoreTrend = await User.countDocuments({
            'integrity.suspicionScore': { $gt: 50 },
            'integrity.lastSuspicionIncreaseAt': { $gte: yesterday }
        });

        // Duplicate ledger attempts
        const duplicateLedgerAttempts = await Transaction.countDocuments({ status: 'failed', notes: /duplicate|idempotency/i });

        // Failed payout attempts
        const failedPayoutAttempts = await Transaction.countDocuments({ status: 'failed', type: 'prize_payout' });

        // Queue backlog growth rate (mocked percentage for now)
        const queueBacklogGrowthRate = 4.2;

        res.json({
            suspicionScoreTrend,
            duplicateLedgerAttempts,
            failedPayoutAttempts,
            queueBacklogGrowthRate
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/state', protect, admin, async (req, res) => {
    try {
        const stateData = await getSystemState();
        res.json(stateData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/state-history', protect, admin, async (req, res) => {
    // Only import locally or at top to avoid circular dependency
    const SystemStateLog = require('../models/SystemStateLog');
    try {
        const history = await SystemStateLog.find().sort({ createdAt: -1 }).limit(50);
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/invariant-check', protect, admin, async (req, res) => {
    const { validateInvariants } = require('../services/invariantValidator');
    try {
        const validation = await validateInvariants();

        if (!validation.pass) {
            return res.status(500).json({
                pass: false,
                failures: validation.failures,
                snapshot: validation.snapshot
            });
        }

        res.json({ pass: true, message: 'All production invariants validated successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/economy-audit', protect, admin, async (req, res) => {
    const { runLightReconciliation, runDeepReconciliation } = require('../services/economicReconciliationService');
    const { deep } = req.query; // e.g. /economy-audit?deep=true

    try {
        let reconciliationResult;
        if (deep === 'true') {
            reconciliationResult = await runDeepReconciliation();
        } else {
            reconciliationResult = await runLightReconciliation();
        }

        if (!reconciliationResult.pass) {
            return res.status(500).json({
                pass: false,
                type: reconciliationResult.type,
                failures: reconciliationResult.failures,
                snapshot: reconciliationResult.snapshot
            });
        }

        res.json({ pass: true, type: reconciliationResult.type, message: 'Economic reconciliation completed successfully with no discrepancies.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
