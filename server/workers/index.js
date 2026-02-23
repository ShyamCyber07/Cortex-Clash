const { Worker } = require('bullmq');
const { redisConfig } = require('../config/queue');
const connectDB = require('../config/db');
require('dotenv').config();

const { _runRankingsUpdate } = require('../services/rankingService');
const { analyzeMatchIntegrity } = require('../services/integrityService');
const { recordMatchPredictionResult } = require('../services/aiService');
const { checkAndResetSeasons } = require('../services/seasonAutomator');
const { advanceTournamentBracket } = require('../services/tournamentAutomator');

const Match = require('../models/Match');
const WorkerStatus = require('../models/WorkerStatus');
const os = require('os');
const mongoose = require('mongoose');

// Initialize MongoDB connection for worker instance specifically
connectDB();

const workerId = `worker-${os.hostname()}-${process.pid}`;
console.log(`[BOOT] Spinning up Worker Node: ${workerId}`);

setInterval(async () => {
    try {
        if (mongoose.connection.readyState === 1) { // 1 = connected
            await WorkerStatus.findOneAndUpdate(
                { workerId },
                {
                    workerId,
                    queues: ['rankingQueue', 'integrityQueue', 'aiQueue', 'seasonQueue', 'tournamentQueue'],
                    memoryUsage: process.memoryUsage(),
                    lastSeen: Date.now()
                },
                { upsert: true, new: true }
            );
        }
    } catch (err) {
        console.error(`[WORKER HEARTBEAT FAULT] ${err.message}`);
    }
}, 30000); // Pulse every 30 seconds

/**
 * Basic Observability Wrapper for Workers
 */
const bindWorkerEvents = (worker, name) => {
    worker.on('completed', job => {
        console.log(`[BULLMQ][${name}] Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[BULLMQ][${name}] Job ${job?.id} FAILED | Dead Letter Queue Action | Reason: ${err.message}`);
        // In a real-world scenario, you could route this payload into a 'FailedJobLedger' Mongo table 
        // or emit an alert to Sentry/Datadog here.
    });

    worker.on('error', err => {
        console.error(`[BULLMQ][${name}] Redis connection / runtime error:`, err);
    });
};

// 1. Ranking Worker
const rankingWorker = new Worker('ranking-updates', async job => {
    const { matchId } = job.data;
    try {
        await _runRankingsUpdate(matchId);
    } catch (err) {
        throw err; // Trigger retry backoff
    }
}, { connection: redisConfig });
bindWorkerEvents(rankingWorker, 'Rankings');

// 2. Integrity Analysis Worker
const integrityWorker = new Worker('integrity-analysis', async job => {
    const { matchId } = job.data;
    try {
        await analyzeMatchIntegrity(matchId);
    } catch (err) {
        throw err;
    }
}, { connection: redisConfig });
bindWorkerEvents(integrityWorker, 'Integrity');

// 3. AI Metrics Worker
const aiMetricsWorker = new Worker('ai-metrics', async job => {
    const { matchId } = job.data;
    try {
        const match = await Match.findById(matchId).populate('participants').populate('winner');
        if (match) {
            await recordMatchPredictionResult(match);
        }
    } catch (err) {
        throw err;
    }
}, { connection: redisConfig });
bindWorkerEvents(aiMetricsWorker, 'AI Tracking');

// 4. Season Rollover Worker (Singleton Repeatable Job)
const seasonWorker = new Worker('season-rollover', async job => {
    console.log(`[BULLMQ] Processing scheduled Season Rollover check...`);
    try {
        await checkAndResetSeasons();
    } catch (err) {
        throw err;
    }
}, { connection: redisConfig });
bindWorkerEvents(seasonWorker, 'Season');

// 5. Tournament Automator Worker
const tournamentWorker = new Worker('tournament-advancement', async job => {
    const { matchId } = job.data;
    try {
        await advanceTournamentBracket(matchId);
    } catch (err) {
        throw err;
    }
}, { connection: redisConfig });
bindWorkerEvents(tournamentWorker, 'Tournament');


console.log('✅ Scalable BullMQ Distributed Workers Initialized globally');

// Graceful shutdown handling
const shutdown = async () => {
    console.log('Shutting down BullMQ workers...');
    await Promise.all([
        rankingWorker.close(),
        integrityWorker.close(),
        aiMetricsWorker.close(),
        seasonWorker.close(),
        tournamentWorker.close()
    ]);
    console.log('BullMQ exited gracefully');
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
