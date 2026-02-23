const axios = require('axios');
const { rankingQueue, tournamentQueue } = require('../config/queue');
const Match = require('../models/Match');
const connectDB = require('../config/db');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:5000/api/v1';
let authToken = ''; // Add an admin JWT here manually for real execution

/**
 * Utility to toggle Chaos via API
 */
const setChaosMode = async (enable) => {
    try {
        console.log(`[SIMULATION] Toggling Chaos Mode: ${enable}`);
        const res = await axios.post(`${API_URL}/system/chaos`, { enable }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log(res.data.message);
    } catch (err) {
        console.error('Failed to toggle chaos:', err.response?.data || err.message);
    }
};

/**
 * Simulation 1: High-Volume Ranking Queue Injection
 * Injects 1000 identical jobs simulating duplicate retries.
 * Tests Idempotency Ledgers (No double-rankings).
 */
const simulateRankingFlood = async () => {
    console.log('[SIMULATION] Flooding Ranking Queue with duplicate jobs...');
    // We need a dummy match ID to simulate
    const matchId = '654321654321654321654321';
    const jobs = Array.from({ length: 1000 }).map(() => ({
        name: 'rank-update',
        data: { matchId }
    }));

    // Add exactly 1000 identical jobs
    await rankingQueue.addBulk(jobs);
    console.log(`[SIMULATION] 1000 ranking jobs pushed. Monitor BullMQ to ensure 999 are cleanly rejected by Idempotency check.`);
};

/**
 * Simulation 2: Distributed Lock Contention on Bracket Advancement
 * Simulates 100 simultaneous triggers competing for the tournament Bracket Redlock.
 */
const simulateBracketContention = async () => {
    console.log('[SIMULATION] Hammering Tournament Bracket Automator...');
    const matchId = 'abcdefabcdefabcdef'; // Dummy

    // Simulate 200 node instances reporting match completion at the exact exact exact same ms
    const racePromises = Array.from({ length: 200 }).map(() => {
        return tournamentQueue.add('advance-bracket', { matchId });
    });

    await Promise.all(racePromises);
    console.log('[SIMULATION] 200 simultaneous bracket advances injected. Check Logs for "Currently locked" debugs.');
};

/**
 * Run simulations
 */
const run = async () => {
    await connectDB();

    // Turn ON chaos mode so the workers fail/lag during these injections
    await setChaosMode(true);

    console.log('\n--- LAUNCHING CHAOS TESTS ---');
    await simulateRankingFlood();
    await simulateBracketContention();

    console.log('\n[SIMULATION] Check backend terminal for [CHAOS EXCEPTION] stack traces and BullMQ failed tables.');
    console.log('Jobs will start landing in DLQ until Chaos is disabled.');

    // Gracefully shutdown simulation script
    setTimeout(async () => {
        await setChaosMode(false);
        console.log('Chaos Mode deactivated. Workers will process normally now.');
        process.exit(0);
    }, 15000);
};

if (require.main === module) {
    if (!authToken) {
        console.warn('⚠️ No ADMIN JWT provided. API toggle will fail. Proceeding with Queue injections directly.');
    }
    run();
}

module.exports = { simulateRankingFlood, simulateBracketContention };
