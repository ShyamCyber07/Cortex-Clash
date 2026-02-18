const User = require('../models/User');
const Match = require('../models/Match');
const IntegrityLog = require('../models/IntegrityLog');
const { getPrediction } = require('./aiService');

const SUSPICION_THRESHOLD = 50;

/**
 * Main function to analyze a completed match for integrity anomalies.
 * @param {string} matchId 
 */
const analyzeMatchIntegrity = async (matchId) => {
    try {
        const match = await Match.findById(matchId)
            .populate('participants')
            .populate('winner')
            .populate({
                path: 'tournament',
                populate: { path: 'game' }
            });

        if (!match || !match.winner || match.participants.length < 2) return;

        const winner = match.winner;
        const loser = match.participants.find(p => !p._id.equals(winner._id));

        if (!loser) return; // Should not happen in 1v1

        // --- 1. Fetch AI Prediction (Recalculate context) ---
        // We use the stats BEFORE this match ideally, but post-match stats are okay for approximation if delta is small.
        // For strict integrity, we should have stored the prediction result.
        // Let's assume prediction was accurate enough based on current stats minus this game.
        // Or simpler: just use current stats.

        const game = match.tournament?.game;
        const gameId = game?._id.toString();

        // Helper to get stats (duplicated from matchRoutes for now to avoid dependency loop or complexity)
        const getStats = (user, gId) => user.gameStats?.get(gId) || { rankPoints: 1000, wins: 0, matchesPlayed: 0 };

        const wStats = getStats(winner, gameId);
        const lStats = getStats(loser, gameId);

        const prediction = await getPrediction(
            { rating: wStats.rankPoints, winRate: (wStats.wins / (wStats.matchesPlayed || 1)), id: winner._id },
            { rating: lStats.rankPoints, winRate: (lStats.wins / (lStats.matchesPlayed || 1)), id: loser._id },
            { type: game?.name }
        );

        if (!prediction) return;

        // --- 2. Anomaly Detection Logic ---

        let suspicionDelta = 0;
        let reasons = [];

        // A. Low Probability Win (Upset)
        // If Winner had < 20% chance
        const winProb = prediction.predicted_winner === 'p1' ? prediction.win_probability : (1 - prediction.win_probability);
        // Wait, p1 is the first argument to getPrediction (winner), so prediction.win_probability IS winner's probability?
        // Let's double check getPrediction:
        // const response = await axios.post(...)
        // response.data = { win_probability (for p1), ... }
        // Yes.

        // Actually p1 was winner in my call: calculate(winner, loser).
        // So prediction.win_probability is simply the probability for the winner.
        const winnerProb = prediction.win_probability;

        if (winnerProb < 0.2) {
            suspicionDelta += 15;
            reasons.push(`Extreme Upset (Win Chance: ${(winnerProb * 100).toFixed(1)}%)`);
        } else if (winnerProb < 0.35) {
            suspicionDelta += 5;
            reasons.push(`Upset (Win Chance: ${(winnerProb * 100).toFixed(1)}%)`);
        }

        // B. Win Streak Anomaly
        // Assuming we track winStreak on User (added in model update)
        // We need to update the streak first or read it.
        // Let's just blindly increment streak for winner and reset for loser in this logic block, 
        // effectively simulating "live" tracking if not handled elsewhere.
        // Actually, let's just inspect the `integrity.winStreak` field if we maintain it.
        // Since we JUST added it, it will be 0.
        // We should auto-increment it here as part of the analysis (or separate service).
        // Let's just calculate it from match history if needed, or rely on the field.

        // Let's update the streak locally
        winner.integrity.winStreak = (winner.integrity.winStreak || 0) + 1;
        loser.integrity.winStreak = 0;

        if (winner.integrity.winStreak > 10) {
            suspicionDelta += 10;
            reasons.push(`Unnatural Win Streak (${winner.integrity.winStreak})`);
        } else if (winner.integrity.winStreak > 5 && winnerProb < 0.4) {
            // Streak of upsets
            suspicionDelta += 20;
            reasons.push(`Streak of Upsets (${winner.integrity.winStreak})`);
        }

        // C. Performance Spike (Score parsing)
        // If we have score data (e.g. K/D or points)
        if (match.result && typeof match.result === 'object') {
            // Heuristic: If score is overwhelmingly high (e.g. 13-0 in rounds)
            // We'd need game specific parsing.
            // Leaving this as a placeholder for specific game integrations.
        }

        // --- 3. Update Suspicion Score ---

        if (suspicionDelta > 0) {
            winner.integrity.suspicionScore = (winner.integrity.suspicionScore || 0) + suspicionDelta;

            // Check Threshold
            if (winner.integrity.suspicionScore > SUSPICION_THRESHOLD && !winner.integrity.isFlagged) {
                winner.integrity.isFlagged = true;
                winner.integrity.lastFlaggedAt = new Date();
                reasons.push('SUSPICION THRESHOLD EXCEEDED');
            }

            // Log details
            await IntegrityLog.create({
                user: winner._id,
                match: match._id,
                reason: reasons.join(', '),
                scoreDelta: suspicionDelta,
                details: {
                    winnerProb,
                    prediction,
                    winStreak: winner.integrity.winStreak
                }
            });

            await winner.save();
            await loser.save(); // Save streak reset

            console.log(`[INTEGRITY] Flagged analysis for ${winner.username}: +${suspicionDelta} (Total: ${winner.integrity.suspicionScore})`);
        } else {
            // Decay suspicion slightly on "normal" wins?
            // "Repeated wins in LOW probability" -> implies high probability wins are fine.
            // Maybe decay suspicion on "Expected Wins"?
            if (winnerProb > 0.7) {
                winner.integrity.suspicionScore = Math.max(0, (winner.integrity.suspicionScore || 0) - 2);
                await winner.save();
            }
        }

    } catch (err) {
        console.error(`[INTEGRITY ERROR] Failed to analyze match ${matchId}:`, err);
    }
};

module.exports = {
    analyzeMatchIntegrity
};
