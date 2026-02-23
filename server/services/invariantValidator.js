const User = require('../models/User');
const Tournament = require('../models/Tournament');
const { getSystemState, forceCriticalState } = require('./systemStateService');

const validateInvariants = async () => {
    const failures = [];
    const snapshot = {};

    try {
        // 1. Wallet Integrity: No user should have a negative CRX balance
        const negativeWallets = await User.countDocuments({ walletBalance: { $lt: 0 } });
        if (negativeWallets > 0) {
            failures.push(`Wallet Integrity Failed: ${negativeWallets} users have negative balances.`);
            snapshot.negativeWallets = negativeWallets;
        }

        // 2. Ranking Idempotency: All rank points must be valid and non-negative
        const invalidRanks = await User.countDocuments({ 'stats.rankPoints': { $lt: 0 } });
        if (invalidRanks > 0) {
            failures.push(`Ranking Idempotency Failed: ${invalidRanks} users have deeply negative rank points.`);
            snapshot.invalidRanks = invalidRanks;
        }

        // 3. Tournament Bracket Uniqueness: Participants arrays cannot hold duplicates
        const tournaments = await Tournament.find({}, 'participants').lean();
        let tournamentWithDuplicates = 0;
        for (const t of tournaments) {
            if (t.participants && t.participants.length > 0) {
                const uniqueParticipants = new Set(t.participants.map(p => p.toString()));
                if (uniqueParticipants.size !== t.participants.length) {
                    tournamentWithDuplicates++;
                }
            }
        }
        if (tournamentWithDuplicates > 0) {
            failures.push(`Bracket Uniqueness Failed: ${tournamentWithDuplicates} tournaments have duplicate participants.`);
            snapshot.tournamentWithDuplicates = tournamentWithDuplicates;
        }

        // 4. System State Evaluation Freshness: State poller must be alive
        const systemState = await getSystemState();
        const freshnessMs = Date.now() - (systemState.lastChecked || 0);
        // If the state was checked more than 5 minutes ago (300,000ms), the system is stale.
        if (freshnessMs > 300000) {
            failures.push(`State Evaluation Freshness Failed: Last system check was ${freshnessMs}ms ago.`);
            snapshot.freshnessMs = freshnessMs;
        }

        // Escalate automatically if invariants fail
        if (failures.length > 0) {
            console.error('[INVARIANT VALIDATOR] Failure detected. Initiating Critical Escalation.');
            await forceCriticalState('Production Invariant Violation', snapshot);
            return { pass: false, failures, snapshot };
        }

        return { pass: true, failures: [] };

    } catch (e) {
        console.error('[Invariant Validator] Crashed during execution:', e.message);
        failures.push(`Validator Crash: ${e.message}`);
        await forceCriticalState('Production Invariant Crash', { error: e.message });
        return { pass: false, failures, snapshot: { error: e.message } };
    }
};

module.exports = { validateInvariants };
