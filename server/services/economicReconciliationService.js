const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Tournament = require('../models/Tournament');
const { forceCriticalState } = require('./systemStateService');

const runLightReconciliation = async () => {
    return await executeReconciliation(false);
};

const runDeepReconciliation = async () => {
    return await executeReconciliation(true);
};

const executeReconciliation = async (isDeep) => {
    const failures = [];
    const snapshot = {};

    try {
        console.log(`[ECONOMY AUDIT] Starting ${isDeep ? 'DEEP' : 'LIGHT'} reconciliation...`);

        // 1. Total CRX supply conservation
        const userAgg = await User.aggregate([{ $group: { _id: null, totalBalance: { $sum: "$walletBalance" } } }]);
        const txAgg = await Transaction.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, totalTx: { $sum: "$amount" } } }
        ]);

        const totalWalletSum = userAgg[0]?.totalBalance || 0;
        const totalTxSum = txAgg[0]?.totalTx || 0;

        // Note: Javascript float precision issues might cause slight mismatches, so we'll round to 4 decimals
        const roundedWalletSum = Math.round(totalWalletSum * 10000) / 10000;
        const roundedTxSum = Math.round(totalTxSum * 10000) / 10000;

        if (roundedWalletSum !== roundedTxSum) {
            failures.push(`Total CRX supply mismatch: Wallets=${roundedWalletSum}, Transactions=${roundedTxSum}`);
            snapshot.supplyConservation = { wallets: roundedWalletSum, transactions: roundedTxSum };
        }

        // 2. Orphaned Transactions Checks
        // Check for transactions with non-existent users
        const ghostUserTxs = await Transaction.aggregate([
            { $limit: isDeep ? 1000000 : 10000 }, // limit strictly for light, full table scan for deep
            { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "userDoc" } },
            { $match: { userDoc: { $size: 0 } } }
        ]);

        if (ghostUserTxs.length > 0) {
            failures.push(`Orphaned Transactions: ${ghostUserTxs.length} transactions belong to missing users.`);
            snapshot.orphanedUsers = ghostUserTxs.length;
        }

        // Check for transactions with non-existent tournaments
        const ghostTournamentTxs = await Transaction.aggregate([
            { $match: { referenceModel: 'Tournament' } },
            { $lookup: { from: "tournaments", localField: "referenceId", foreignField: "_id", as: "tournamentDoc" } },
            { $match: { tournamentDoc: { $size: 0 } } }
        ]);

        if (ghostTournamentTxs.length > 0) {
            failures.push(`Orphaned Reference: ${ghostTournamentTxs.length} transactions reference missing tournaments.`);
            snapshot.orphanedTournaments = ghostTournamentTxs.length;
        }

        // 3. Duplicate referenceId across specific types
        // A user shouldn't have duplicate entry_fees or refunds for the same tournament
        const duplicateTxs = await Transaction.aggregate([
            { $match: { referenceId: { $ne: null }, type: { $in: ['entry_fee', 'prize_payout', 'refund'] } } },
            { $group: { _id: { user: "$user", referenceId: "$referenceId", type: "$type" }, count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } }
        ]);

        if (duplicateTxs.length > 0) {
            failures.push(`Duplicate ReferenceId: ${duplicateTxs.length} duplicated user-tournament transaction bindings detected.`);
            snapshot.duplicateTxs = duplicateTxs;
        }

        // 4. Wallet delta equals sum of transaction entries (DEEP ONLY)
        if (isDeep) {
            const mismatches = await User.aggregate([
                {
                    $lookup: {
                        from: "transactions",
                        localField: "_id",
                        foreignField: "user",
                        pipeline: [{ $match: { status: 'completed' } }],
                        as: "txs"
                    }
                },
                {
                    $addFields: { calculatedBalance: { $sum: "$txs.amount" } }
                },
                {
                    // Round to avoid float precision false positives
                    $addFields: {
                        roundedWallet: { $round: ["$walletBalance", 4] },
                        roundedCalc: { $round: ["$calculatedBalance", 4] }
                    }
                },
                {
                    $match: { $expr: { $ne: ["$roundedWallet", "$roundedCalc"] } }
                }
            ]);

            if (mismatches.length > 0) {
                failures.push(`Wallet Delta Mismatch: ${mismatches.length} users have balances that do not map to their transaction history.`);
                snapshot.walletMismatches = mismatches.length;
                snapshot.sampleMismatchedUsers = mismatches.slice(0, 5).map(u => ({ id: u._id, expected: u.calculatedBalance, actual: u.walletBalance }));
            }
        }

        if (failures.length > 0) {
            console.error('[ECONOMY AUDIT] Discrepancy detected. Initiating Critical Escalation.');
            await forceCriticalState('Economic Reconciliation Failure', { type: isDeep ? 'DEEP' : 'LIGHT', failures, snapshot });
            return { pass: false, failures, snapshot, type: isDeep ? 'DEEP' : 'LIGHT' };
        }

        return { pass: true, failures: [], type: isDeep ? 'DEEP' : 'LIGHT' };

    } catch (e) {
        console.error('[ECONOMY AUDIT] Crashed during execution:', e.message);
        failures.push(`Reconciliation Crash: ${e.message}`);
        await forceCriticalState('Economic Reconciliation Crash', { error: e.message });
        return { pass: false, failures, snapshot: { error: e.message } };
    }
};

module.exports = {
    runLightReconciliation,
    runDeepReconciliation
};
