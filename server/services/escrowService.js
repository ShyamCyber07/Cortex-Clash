const mongoose = require('mongoose');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Transaction = require('../models/Transaction');
const { ECONOMY } = require('../config/guardrails');
const { injectChaos } = require('../utils/chaos');
const { getSystemState } = require('./systemStateService');
const { v4: uuidv4 } = require('uuid');

/**
 * Safely processes entry fee deduction when joining tournament.
 * Uses MongoDB ACID properties ($inc) or sessions to avoid double deduction race conditions.
 */
const deductTournamentEntryFee = async (userId, tournamentId, providedIdempotencyKey) => {
    // Unique key generator if none provided specifically
    const idempotencyKey = providedIdempotencyKey || `entry_${userId}_${tournamentId}`;
    // We use a transaction session for safe, atomic operations
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const tournament = await Tournament.findById(tournamentId).session(session);
        if (!tournament) throw new Error('Tournament not found');

        const fee = tournament.entryFee || 0;

        // If it's a free tournament, just return instantly
        if (fee === 0) {
            await session.commitTransaction();
            session.endSession();
            return { success: true };
        }

        // Ensure fee doesn't breach absolute platform config limit
        if (fee > ECONOMY.MAX_ENTRY_FEE) {
            throw new Error(`Tournament entry fee exceeds platform maximum (${ECONOMY.MAX_ENTRY_FEE} CRX)`);
        }

        const user = await User.findById(userId).session(session);
        if (!user || user.walletBalance < fee) {
            throw new Error(`Insufficient funds. Need ${fee} CRX.`);
        }

        // Daily Transfer Audit Check (CRX Limit per 24h)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const dailyTxs = await Transaction.aggregate([
            { $match: { user: user._id, type: 'entry_fee', createdAt: { $gte: yesterday } } },
            { $group: { _id: null, totalSpent: { $sum: { $abs: "$amount" } } } }
        ]).session(session);
        const totalSpent24h = dailyTxs[0]?.totalSpent || 0;

        if (totalSpent24h + fee > ECONOMY.MAX_DAILY_TRANSFER) {
            throw new Error(`Daily platform transfer limit exceeded (${ECONOMY.MAX_DAILY_TRANSFER} CRX).`);
        }

        const previousBalance = user.walletBalance;

        // Deduct
        user.walletBalance -= fee;
        await user.save({ session });

        // Record Transaction
        await Transaction.create([{
            user: userId,
            type: 'entry_fee',
            amount: -fee,
            previousBalance,
            newBalance: user.walletBalance,
            referenceId: tournamentId,
            referenceModel: 'Tournament',
            idempotencyKey,
            notes: `Entry fee for ${tournament.name}`
        }], { session });

        await injectChaos('Escrow: Entry Fee Deduction', idempotencyKey);

        await session.commitTransaction();
        session.endSession();
        return { success: true, newBalance: user.walletBalance };

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }
};

/**
 * Disburse total prize pool to winner when tournament ends
 */
const distributeTournamentPrize = async (tournamentId, winnerId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { state } = getSystemState();
        if (state === 'CRITICAL') {
            throw new Error('SYSTEM_CRITICAL: Platform is currently in a critical state. Payouts are temporarily frozen.');
        }

        const tournament = await Tournament.findById(tournamentId).session(session);
        if (!tournament) throw new Error('Tournament not found');

        const entryFee = tournament.entryFee || 0;
        const totalParticipants = tournament.participants.length;

        // Base prize + (participants * fee)
        let totalPrizePool = (tournament.basePrizePool || 0) + (totalParticipants * entryFee);

        if (totalPrizePool === 0) {
            await session.commitTransaction();
            session.endSession();
            return { success: true };
        }

        // Optional absolute hardcap on payouts internally
        if (totalPrizePool > ECONOMY.MAX_PRIZE_PAYOUT) {
            console.warn(`[ESCROW AUDIT] Tournament ${tournamentId} breached cap! Payout throttled to max limit: ${ECONOMY.MAX_PRIZE_PAYOUT}`);
            totalPrizePool = ECONOMY.MAX_PRIZE_PAYOUT;
        }

        const winner = await User.findById(winnerId).session(session);
        if (!winner) throw new Error('Winner not found');

        const previousBalance = winner.walletBalance;
        winner.walletBalance += totalPrizePool;
        await winner.save({ session });

        await Transaction.create([{
            user: winnerId,
            type: 'prize_payout',
            amount: totalPrizePool,
            previousBalance,
            newBalance: winner.walletBalance,
            referenceId: tournamentId,
            referenceModel: 'Tournament',
            notes: `Prize payout from ${tournament.name}`
        }], { session });

        await injectChaos('Escrow: Prize Payout', tournamentId.toString());

        await session.commitTransaction();
        session.endSession();
        console.log(`[ESCROW] Distributed ${totalPrizePool} CRX to ${winner.username} for ${tournament.name}`);
        return { success: true, payout: totalPrizePool };

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }
};

module.exports = {
    deductTournamentEntryFee,
    distributeTournamentPrize
};
