const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const User = require('../models/User');
const { redlock } = require('../config/lock');
const { injectChaos } = require('../utils/chaos');

/**
 * Handle auto-advancing the bracket when a match completes.
 * @param {string} matchId The ID of the match that just finished
 */
const advanceTournamentBracket = async (matchId) => {
    try {
        const match = await Match.findById(matchId);
        if (!match || !match.tournament) return;

        // Obtain strict distributed lock so multiple instances responding to 10 simultaneous match completions don't duplicate
        let lock;
        try {
            lock = await redlock.acquire([`lock:tournament:${match.tournament}`], 5000);
        } catch (lockError) {
            console.log(`[TOURNAMENT ${match.tournament}] Currently locked by another process adjusting the bracket.`);
            return;
        }

        try {
            const tournament = await Tournament.findById(match.tournament).populate('matches');
            if (!tournament) return;

            await injectChaos('Tournament: Bracket Advance', tournament._id.toString());

            // Find all matches in the same round
            const currentRound = match.round;
            const roundMatches = tournament.matches.filter(m => m.round === currentRound);

            // Check if all matches in this round are completed
            const allCompleted = roundMatches.every(m => m.status === 'completed');
            if (!allCompleted) {
                console.log(`[TOURNAMENT ${tournament._id}] Round ${currentRound} still has pending matches.`);
                return;
            }

            console.log(`[TOURNAMENT ${tournament._id}] Round ${currentRound} is complete. Checking progression...`);

            // If this round only had 1 match, the tournament is OVER.
            if (roundMatches.length === 1) {
                console.log(`[TOURNAMENT ${tournament._id}] Final complete! Distributing rewards.`);
                await finalizeTournament(tournament, match.winner);
                return;
            }

            // Bracket advancement: pair up the winners
            // Since matches are saved in order (e.g., Match 1, Match 2...), we sort them by createdAt to ensure consistent bracket structure
            const sortedRoundMatches = roundMatches.sort((a, b) => a.createdAt - b.createdAt);

            const winners = sortedRoundMatches.map(m => m.winner);

            if (winners.includes(null) || winners.includes(undefined)) {
                console.error(`[TOURNAMENT ERROR] Missing winners in completed round ${currentRound}`);
                return;
            }

            const nextRound = currentRound + 1;
            const newMatches = [];
            const matchPromises = [];

            // Pair winners: 1v2, 3v4, etc.
            for (let i = 0; i < winners.length; i += 2) {
                const p1 = winners[i];
                const p2 = winners[i + 1];

                // If an odd number of players advance (e.g. from bye), p2 might be undefined
                // If p2 is undefined, p1 gets a bye (advances automatically to next round)
                if (!p2) {
                    console.log(`[TOURNAMENT ${tournament._id}] Player ${p1} gets a bye in Round ${nextRound}`);
                    const nextRoundMatch = new Match({
                        tournament: tournament._id,
                        round: nextRound,
                        participants: [p1],
                        winner: p1, // Auto-advance
                        status: 'completed',
                        verificationStatus: 'verified',
                        score: 'Bye',
                        startTime: new Date(),
                        endTime: new Date()
                    });
                    newMatches.push(nextRoundMatch);
                    matchPromises.push(nextRoundMatch.save());

                    // Keep the chain going checking automation recursively
                } else {
                    const nextRoundMatch = new Match({
                        tournament: tournament._id,
                        round: nextRound,
                        participants: [p1, p2],
                        status: 'scheduled',
                        startTime: new Date()
                    });
                    newMatches.push(nextRoundMatch);
                    matchPromises.push(nextRoundMatch.save());
                }
            }

            const savedMatches = await Promise.all(matchPromises);
            tournament.matches.push(...savedMatches.map(m => m._id));
            await tournament.save();

            console.log(`[TOURNAMENT ${tournament._id}] Advanced to Round ${nextRound}. Created ${savedMatches.length} matches.`);

            // Require socket to notify clients
            const io = require('../socket').getIO();
            io.emit('tournament_update', { tournamentId: tournament._id, event: 'bracket_advanced', round: nextRound });

            // Trigger recursive check in case a Bye instantly completed the final round
            const newlyCompletedMatches = savedMatches.filter(m => m.status === 'completed');
            if (newlyCompletedMatches.length > 0 && newMatches.length === 1) {
                // Only 1 match in next round and it instantly completed = tournament over
                await advanceTournamentBracket(newlyCompletedMatches[0]._id);
            }
        } finally {
            if (lock) await lock.release();
        }

    } catch (err) {
        console.error('[TOURNAMENT AUTOMATOR] Bracket advancement failed:', err);
    }
};

/**
 * Handle tournament completion and reward distribution.
 */
const finalizeTournament = async (tournament, winnerId) => {
    if (tournament.status === 'completed') return; // Already done

    try {
        tournament.status = 'completed';
        tournament.endDate = new Date();
        await tournament.save();

        const winner = await User.findById(winnerId);
        if (winner) {
            // Reward: Badge and Rank Points Boost
            const tournamentBadge = {
                name: `${tournament.name} Champion`,
                description: `Won the ${tournament.name} tournament playing ${tournament.game?.name || 'an esports title'}.`,
                icon: '👑', // Gold crown
                date: new Date()
            };

            winner.badges.push(tournamentBadge);

            // Big boost in stats
            if (!winner.stats) winner.stats = {};
            winner.stats.rankPoints = (winner.stats.rankPoints || 1000) + 100;

            await winner.save();
            console.log(`[TOURNAMENT REWARDS] Distributed champion badge to ${winner.username} for ${tournament.name}`);
        }

        // --- NEW: MONETIZATION LAYER ---
        const { distributeTournamentPrize } = require('./escrowService');
        await distributeTournamentPrize(tournament._id, winnerId);

        await injectChaos('Tournament: Reward Finalization Payload', tournament._id.toString());

        // Emit final update
        const io = require('../socket').getIO();
        io.emit('tournament_update', { tournamentId: tournament._id, event: 'tournament_completed', winner: winnerId });

    } catch (err) {
        console.error('[TOURNAMENT AUTOMATOR] Finalization failed:', err);
    }
};

module.exports = {
    advanceTournamentBracket,
    finalizeTournament
};
