const connectDB = require('../config/db');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Transaction = require('../models/Transaction');
const RankingLedger = require('../models/RankingLedger');
const { simulateRankingFlood, simulateBracketContention } = require('./chaosSimulation');
const { toggleChaos } = require('../utils/chaos');

require('dotenv').config();

let snapshots = {};

const takeSnapshots = async () => {
    console.log('📸 [PHASE 1] Taking Pre-Chaos System Snapshots...');

    // 1. Economic Health
    const users = await User.find({}, 'walletBalance stats gameStats');
    let totalEconomyCRX = 0;
    let usersWithBalances = {};
    users.forEach(u => {
        totalEconomyCRX += u.walletBalance;
        usersWithBalances[u._id.toString()] = u.walletBalance;
    });

    // 2. Transaction Logs
    const txCount = await Transaction.countDocuments();

    // 3. Match Ranking Ledgers
    const rankingCount = await RankingLedger.countDocuments();

    snapshots = {
        totalEconomyCRX,
        usersWithBalances,
        txCount,
        rankingCount,
        timestamp: Date.now()
    };

    console.log(`[SNAPSHOT] Platform CRX: ${totalEconomyCRX}`);
    console.log(`[SNAPSHOT] Ledger Txs: ${txCount}`);
    console.log(`[SNAPSHOT] Unique Ranks: ${rankingCount}`);
};

const assertValidation = (condition, errorMessage, correlationId) => {
    if (!condition) {
        console.error(`❌ [ASSERTION FAILED]: ${errorMessage}`);
        console.error(`   Correlation ID: ${correlationId}`);
        process.exit(1);
    }
}

const runValidations = async () => {
    console.log('\n🔎 [PHASE 3] Running Post-Chaos Integrity Validations...');

    // 1. Validate No Negative Balances
    const negativeUsers = await User.find({ walletBalance: { $lt: 0 } });
    assertValidation(
        negativeUsers.length === 0,
        `Found ${negativeUsers.length} users with fatal negative CRX balances!`,
        'ASSERT_ECONOMY_NEGATIVE_CRX'
    );

    // 2. Validate Duplicate Ranking Rejection (Ranking Flood Simulation check)
    // We flooded 1000 identical jobs in the simulation. Exactly 1 ranking should have been parsed globally
    // IF the system was completely empty beforehand. But since we just want to verify the ledger:
    const newRankingCount = await RankingLedger.countDocuments();
    const rankDelta = newRankingCount - snapshots.rankingCount;
    assertValidation(
        rankDelta <= 1,
        `Ranking Idempotency Failed! Expected max 1 rank ledger update, found: ${rankDelta}`,
        'ASSERT_RANKING_IDEMPOTENCY'
    );

    // 3. Validate Transaction Idempotency
    const duplicateTxs = await Transaction.aggregate([
        { $match: { type: 'prize_payout' } },
        { $group: { _id: "$referenceId", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
    ]);

    assertValidation(
        duplicateTxs.length === 0,
        `Duplicate Tournament Payout detected! MongoDB Compound Index failure.`,
        'ASSERT_DB_INDEX_PRIZE_PAYOUT'
    );

    console.log('✅ [SUCCESS] All enterprise resiliency limits successfully guarded production state!');
};

const executeCertification = async () => {
    await connectDB();
    console.log('-- CORTEX CLASH: AUTOMATED CHAOS CERTIFICATION ENGINE --\n');

    await takeSnapshots();

    console.log('\n🔥 [PHASE 2] Initiating Global Chaos Simulations...');

    // Turn on Chaos via module directly since we're in the same process
    toggleChaos(true, 2); // 2 minute TTL

    // Run Simulators
    await simulateRankingFlood();
    await simulateBracketContention();

    // Wait 10 seconds for queues to chew through failures and let Mongo rollbacks resolve
    console.log('\n⏳ Waiting 10s for BullMQ queues and Mongo Distributed Locks to settle state...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    toggleChaos(false);

    await runValidations();

    console.log('\n🛡️ CORTEX CLASH PLATFORM IS CERTIFIED SAFE FOR PRODUCTION.');
    process.exit(0);
};

if (require.main === module) {
    executeCertification();
}

module.exports = { takeSnapshots, runValidations };
