const User = require('../models/User');
const Match = require('../models/Match');
const Season = require('../models/Season');
const RankingLedger = require('../models/RankingLedger');
const { injectChaos } = require('../utils/chaos');
const config = require('../config');
const { rankingQueue } = require('../config/queue');

const BASE_K_FACTOR = 32;

const getGameStats = (user, gameId) => {
    // Return existing stats or default structure
    const stats = user.gameStats?.get(gameId.toString()) || {
        rankPoints: 1000,
        wins: 0,
        losses: 0,
        matchesPlayed: 0
    };
    return stats;
};

const _runRankingsUpdate = async (matchId) => {
    // Deep populate to get game rules
    const match = await Match.findById(matchId)
        .populate('participants')
        .populate('winner')
        .populate({
            path: 'tournament',
            populate: { path: 'game season' } // Get tournament's season if set
        });

    if (!match || !match.tournament?.game) return;

    // Determine Active Season (Use tournament's season or find active)
    let seasonId = match.tournament.season?._id;
    if (!seasonId) {
        const activeSeason = await Season.findOne({ isActive: true });
        seasonId = activeSeason?._id;
    }

    const game = match.tournament.game;
    const participants = match.participants;

    // Safety check
    if (participants.length < 2) return;

    // --- LOGIC DISPATCHER ---

    // 1. Battle Royale / FFA (Points-based with > 2 players)
    if (game.scoringType === 'points-based' && participants.length > 2) {
        await processMultiplayerRanking(match, game, participants, seasonId);
    }
    // 2. Standard 1v1 / Team vs Team (Round-based or Win-Loss)
    else {
        await processDuelRanking(match, game, participants, seasonId);
    }
};

const updateRankings = async (matchId) => {
    // Push the ranking generation to Redis queue instead of doing it synchronously
    await rankingQueue.add('rank-update', { matchId });
    console.log(`[BULLMQ] Dispatched match ${matchId} to rankingQueue`);
};

// Handle 1v1 or Team vs Team
const processDuelRanking = async (match, game, participants, seasonId) => {
    const winner = participants.find(p => p._id.equals(match.winner._id));
    const loser = participants.find(p => !p._id.equals(match.winner._id));

    if (!winner || !loser) return;

    // Idempotency Gate (Guarantees exactly 1 update)
    try {
        await RankingLedger.create([
            { user: winner._id, match: match._id },
            { user: loser._id, match: match._id }
        ]);
    } catch (err) {
        if (err.code === 11000) {
            console.warn(`[RANKING] Idempotency block hit: Match ${match._id} ratings already processed.`);
            return;
        }
        throw err;
    }

    // Get current ratings (Global for now to seed, or Game Specific)
    // We update BOTH global and game-specific
    const gameId = game._id.toString();
    const wGameStats = getGameStats(winner, gameId);
    const lGameStats = getGameStats(loser, gameId);

    const Ra = wGameStats.rankPoints;
    const Rb = lGameStats.rankPoints;

    await injectChaos('Ranking: Elo Duel', match._id.toString());

    // Calculate Margin Multiplier
    let kMultiplier = 1;

    if (game.scoringType === 'round-based' && match.result?.scores) {
        // match.result.scores is { userId: score, ... }
        // Calculate score diff
        const wScore = match.result.scores[winner._id] || 0;
        const lScore = match.result.scores[loser._id] || 0;
        const diff = Math.abs(wScore - lScore);

        // E.g. 13-0 (diff 13) -> 1.5x K-factor. 13-11 (diff 2) -> 1.1x
        kMultiplier = 1 + (diff / 26); // Tuning constant
    }

    const currentK = BASE_K_FACTOR * kMultiplier;

    // Expected Scores
    let Ea, Eb;

    try {
        const axios = require('axios');
        // ML Service Prediction
        const p1WinRate = wGameStats.wins / (wGameStats.matchesPlayed || 1);
        const p2WinRate = lGameStats.wins / (lGameStats.matchesPlayed || 1);

        const response = await axios.post(config.mlServiceUrl, {
            p1_rating: Ra,
            p2_rating: Rb,
            p1_win_rate: p1WinRate,
            p2_win_rate: p2WinRate
        }, { timeout: 1000 }); // Fast timeout to fallback quickly

        if (response.data) {
            Ea = response.data.win_probability;
            Eb = 1 - Ea;
            console.log(`[ML PREDICTION] P1 Win Prob: ${Ea.toFixed(2)} vs Actual: ${Sa}`);
        }
    } catch (error) {
        // Fallback to standard Elo if ML service is down
        console.warn("[ML SERVICE] Unavailable, using standard Elo");
        Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
        Eb = 1 / (1 + Math.pow(10, (Ra - Rb) / 400));
    }

    // Ensure Ea/Eb are set if try block skipped (redundant safety)
    if (Ea === undefined) {
        Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
        Eb = 1 / (1 + Math.pow(10, (Ra - Rb) / 400));
    }

    // Actual Scores (1 for win, 0 for loss)
    const Sa = 1;
    const Sb = 0;

    const deltaA = Math.round(currentK * (Sa - Ea));
    const deltaB = Math.round(currentK * (Sb - Eb));

    const newRa = Ra + deltaA;
    const newRb = Rb + deltaB;

    // --- Update Winner ---
    updateUserStats(winner, gameId, newRa, true, deltaA, seasonId);

    // --- Update Loser ---
    updateUserStats(loser, gameId, newRb, false, deltaB, seasonId);

    await winner.save();
    await loser.save();
};

// Handle Multi-player (FFA/BR)
const processMultiplayerRanking = async (match, game, participants, seasonId) => {
    // For BR, we need placements. 
    // match.result.scores should look like { userId: { rank: 1, ... } }

    const gameId = game._id.toString();
    const totalPlayers = participants.length;

    for (const participant of participants) {
        // Idempotency Check per player
        try {
            await RankingLedger.create({ user: participant._id, match: match._id });
        } catch (err) {
            if (err.code === 11000) {
                continue; // This user was already ranked from a duplicate job.
            }
            throw err;
        }

        await injectChaos('Ranking: BR Placement', match._id.toString());

        const pStats = getGameStats(participant, gameId);
        const currentRating = pStats.rankPoints;

        // Get placement
        const pResult = match.result?.scores?.[participant._id] || {};
        const rank = pResult.rank || totalPlayers; // Default to last if missing

        // Performance Score (0 to 1). 1st place = 1.0, Last place = 0.0
        // Formula: (Total - Rank) / (Total - 1)
        const actualScore = totalPlayers > 1 ? (totalPlayers - rank) / (totalPlayers - 1) : 1;

        // Expected Score (Simplified: compare against average rating of lobby)
        // For a proper implementation, we'd compare against every other player.
        // Simplified: Expected score roughly 0.5 (middle of pack).
        // A better heuristic: Compare to average Elo of the lobby.
        const avgLobbyElo = participants.reduce((acc, p) => acc + (getGameStats(p, gameId).rankPoints), 0) / totalPlayers;

        const expectedScore = 1 / (1 + Math.pow(10, (avgLobbyElo - currentRating) / 400));

        // Weight Placement heavily
        // K-Factor can be higher for BR to allow faster movement
        const BR_K_FACTOR = 40;

        const delta = Math.round(BR_K_FACTOR * (actualScore - expectedScore));

        const newRating = currentRating + delta;
        const isWin = rank === 1; // Only 1st is a "Win" in strict terms, or Top N.

        updateUserStats(participant, gameId, newRating, isWin, delta, seasonId);
        await participant.save();
    }
};

// Helper to update User model with Season Stats
const updateUserStats = (user, gameId, newRank, isWin, delta, seasonId) => {
    // 1. Update Lifetime Game Specific Stats
    const existingGameStats = user.gameStats?.get(gameId) || {
        rankPoints: 1000, wins: 0, losses: 0, matchesPlayed: 0
    };

    existingGameStats.rankPoints = newRank;
    existingGameStats.matchesPlayed += 1;
    if (isWin) existingGameStats.wins += 1;
    else existingGameStats.losses += 1;

    if (!user.gameStats) user.gameStats = new Map();
    user.gameStats.set(gameId, existingGameStats);

    // 2. Update Season Specific Stats (if active season)
    if (seasonId) {
        const sId = seasonId.toString();
        // seasonStats structure: { seasonId: { gameId: { rankPoints... } } }
        // BUT Mongo Maps are Key -> Value. Value must be object.
        // Let's store seasonStats as Map<SeasonId, Map<GameId, Stats>>? No, Map<String, Mixed>

        let seasonData = user.seasonStats?.get(sId) || {};
        let sGameStats = seasonData[gameId] || {
            rankPoints: 1000, wins: 0, losses: 0, matchesPlayed: 0
        };

        // Apply delta to season rank (start fresh at 1000 if new season)
        sGameStats.rankPoints = (sGameStats.rankPoints || 1000) + delta;
        sGameStats.matchesPlayed = (sGameStats.matchesPlayed || 0) + 1;
        if (isWin) sGameStats.wins = (sGameStats.wins || 0) + 1;
        else sGameStats.losses = (sGameStats.losses || 0) + 1;

        seasonData[gameId] = sGameStats;

        if (!user.seasonStats) user.seasonStats = new Map();
        user.seasonStats.set(sId, seasonData);
        user.markModified('seasonStats');
    }

    // 3. Update Global Stats (Aggregate or mirror for now - purely visual "Profile Level")
    user.stats.rankPoints += delta;
    user.stats.matchesPlayed += 1;
    if (isWin) user.stats.wins += 1;
    else user.stats.losses += 1;

    user.stats.eloHistory.push({ rating: user.stats.rankPoints });
    user.stats.consistency = Math.round((user.stats.wins / user.stats.matchesPlayed) * 100);

    user.markModified('gameStats');
};

module.exports = { updateRankings, _runRankingsUpdate, getGameStats };
