const { Worker } = require('bullmq');
const { rankingQueue, integrityQueue, aiMetricsQueue, tournamentQueue, seasonQueue, systemQueue, redisConfig } = require('../config/queue');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const SystemStateLog = require('../models/SystemStateLog');
const GUARDRAILS = require('../config/guardrails');

const REDIS_STATE_KEY = 'cortex:system_state';

// Using the bullmq underlying redis client
let redisClient;
const getRedisClient = async () => {
    if (!redisClient) {
        redisClient = await systemQueue.client;
    }
    return redisClient;
}

const getSystemState = async () => {
    try {
        const client = await getRedisClient();
        const raw = await client.get(REDIS_STATE_KEY);
        if (raw) {
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('[SystemState] Error reading from Redis:', e.message);
    }
    return { state: 'NORMAL', reason: 'System initialized', lastChecked: Date.now() };
};

const evaluateSystemState = async () => {
    try {
        const queues = [rankingQueue, integrityQueue, aiMetricsQueue, tournamentQueue, seasonQueue];
        let maxDepth = 0;
        let totalFailed = 0;

        for (const q of queues) {
            try {
                const counts = await q.getJobCounts('wait', 'active', 'delayed', 'completed', 'failed');
                const depth = counts.wait + counts.active + counts.delayed;
                if (depth > maxDepth) maxDepth = depth;
                totalFailed += counts.failed;
            } catch (e) {
                // Ignore queue fetch errors
            }
        }

        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const suspicionScoreTrend = await User.countDocuments({
            'integrity.suspicionScore': { $gt: 50 },
            'integrity.lastSuspicionIncreaseAt': { $gte: yesterday }
        });

        const duplicateLedgerAttempts = await Transaction.countDocuments({ status: 'failed', notes: /duplicate|idempotency/i, createdAt: { $gte: yesterday } });
        const failedPayoutAttempts = await Transaction.countDocuments({ status: 'failed', type: 'prize_payout', createdAt: { $gte: yesterday } });

        const THRESHOLDS = GUARDRAILS.PROTECTION;
        const currentContext = await getSystemState();
        let newState = currentContext.state;
        let lastReason = currentContext.reason;

        // Static Checks (immediate trigger if exceeded)
        let staticCrit = false;
        let staticDeg = false;

        if (
            suspicionScoreTrend >= THRESHOLDS.CRITICAL_SUSPICION_SPIKE ||
            duplicateLedgerAttempts >= THRESHOLDS.CRITICAL_LEDGER_CONFLICTS ||
            failedPayoutAttempts >= THRESHOLDS.CRITICAL_FAILED_PAYOUTS
        ) {
            staticCrit = true;
        } else if (
            suspicionScoreTrend >= THRESHOLDS.DEGRADED_SUSPICION_SPIKE ||
            duplicateLedgerAttempts >= THRESHOLDS.DEGRADED_LEDGER_CONFLICTS ||
            failedPayoutAttempts >= THRESHOLDS.DEGRADED_FAILED_PAYOUTS
        ) {
            staticDeg = true;
        }

        // Hysteresis calculation over Queue Depth and Failed Jobs
        if (newState === 'NORMAL') {
            if (staticCrit || totalFailed >= THRESHOLDS.CRITICAL_FAILED_JOBS_ENTER) {
                newState = 'CRITICAL';
                lastReason = staticCrit ? 'Critical markers detected.' : 'Critical failed jobs limit exceeded.';
            } else if (staticDeg || maxDepth >= THRESHOLDS.DEGRADED_QUEUE_DEPTH_ENTER) {
                newState = 'DEGRADED';
                lastReason = staticDeg ? 'Elevated risk markers.' : 'High queue depth. Operating in degraded mode.';
            }
        } else if (newState === 'DEGRADED') {
            if (staticCrit || totalFailed >= THRESHOLDS.CRITICAL_FAILED_JOBS_ENTER) {
                newState = 'CRITICAL';
                lastReason = staticCrit ? 'Critical markers detected.' : 'Critical failed jobs limit exceeded.';
            } else if (
                !staticDeg &&
                maxDepth < THRESHOLDS.NORMAL_QUEUE_DEPTH_RETURN &&
                totalFailed < THRESHOLDS.CRITICAL_FAILED_JOBS_ENTER
            ) {
                newState = 'NORMAL';
                lastReason = 'All systems returned to nominal.';
            }
        } else if (newState === 'CRITICAL') {
            if (
                !staticCrit &&
                totalFailed < THRESHOLDS.DEGRADED_FAILED_JOBS_RETURN
            ) {
                newState = 'DEGRADED';
                lastReason = 'Critical conditions resolved, operating in degraded mode.';

                // If also meets normal bounds, fall completely to NORMAL
                if (!staticDeg && maxDepth < THRESHOLDS.NORMAL_QUEUE_DEPTH_RETURN) {
                    newState = 'NORMAL';
                    lastReason = 'All systems returned to nominal.';
                }
            }
        }

        const metricsSnapshot = { maxDepth, totalFailed, suspicionScoreTrend, duplicateLedgerAttempts, failedPayoutAttempts };

        if (newState !== currentContext.state) {
            // Log transition
            await SystemStateLog.create({
                previousState: currentContext.state,
                newState,
                triggerMetric: lastReason,
                snapshotMetrics: metricsSnapshot
            });
            console.log(`[PROTECTION] 🛡️ State change: ${currentContext.state} -> ${newState}. Reason: ${lastReason}`);
        }

        const stateObj = { state: newState, reason: lastReason, lastChecked: Date.now(), metrics: metricsSnapshot };

        // Save to redis
        const client = await getRedisClient();
        await client.set(REDIS_STATE_KEY, JSON.stringify(stateObj));

        return stateObj;

    } catch (err) {
        console.error('[SystemState] Error calculating state:', err.message);
    }
};

const forceCriticalState = async (reason, snapshot = {}) => {
    try {
        const client = await getRedisClient();
        const currentContext = await getSystemState();

        if (currentContext.state !== 'CRITICAL') {
            await SystemStateLog.create({
                previousState: currentContext.state,
                newState: 'CRITICAL',
                triggerMetric: reason,
                snapshotMetrics: snapshot
            });
            console.log(`[PROTECTION] 🚨 INVARIANT FAILURE - FORCING CRITICAL: ${currentContext.state} -> CRITICAL. Reason: ${reason}`);
        }

        const stateObj = { state: 'CRITICAL', reason, lastChecked: Date.now(), metrics: snapshot };
        await client.set(REDIS_STATE_KEY, JSON.stringify(stateObj));
        return stateObj;
    } catch (e) {
        console.error('[SystemState] Error forcing critical state:', e.message);
    }
};

const systemStateWorker = new Worker('system-state', async (job) => {
    if (job.name === 'evaluate-state') {
        await evaluateSystemState();
    } else if (job.name === 'invariant-audit') {
        const { validateInvariants } = require('./invariantValidator');
        await validateInvariants();
    } else if (job.name === 'economy-audit-light') {
        const { runLightReconciliation } = require('./economicReconciliationService');
        await runLightReconciliation();
    } else if (job.name === 'economy-audit-deep') {
        const { runDeepReconciliation } = require('./economicReconciliationService');
        await runDeepReconciliation();
    }
}, { connection: redisConfig });

// Initialize repeatable job pattern safely
(async () => {
    try {
        await systemQueue.add('evaluate-state', {}, {
            repeat: {
                every: 15000 // every 15s evaluate state
            },
            removeOnComplete: true,
            removeOnFail: true,
            jobId: 'evaluate-state-repeat'
        });

        await systemQueue.add('invariant-audit', {}, {
            repeat: {
                pattern: '0 0 * * *' // daily at midnight
            },
            removeOnComplete: true,
            removeOnFail: true,
            jobId: 'invariant-audit-repeat'
        });

        await systemQueue.add('economy-audit-light', {}, {
            repeat: {
                pattern: '0 */6 * * *' // every 6 hours
            },
            removeOnComplete: true,
            removeOnFail: true,
            jobId: 'economy-audit-light-repeat'
        });

        await systemQueue.add('economy-audit-deep', {}, {
            repeat: {
                pattern: '0 2 * * *' // daily at 2:00 AM
            },
            removeOnComplete: true,
            removeOnFail: true,
            jobId: 'economy-audit-deep-repeat'
        });
    } catch (e) {
        console.error('[SystemState] Failed adding repeatable job:', e.message);
    }
})();

module.exports = {
    getSystemState,
    evaluateSystemState,
    forceCriticalState,
    systemStateWorker
};
