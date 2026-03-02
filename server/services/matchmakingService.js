const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const User = require('../models/User');
const config = require('../config');

const generateMatches = async (tournamentId) => {
    const tournament = await Tournament.findById(tournamentId).populate('participants');
    if (!tournament) throw new Error('Tournament not found');

    if (tournament.participants.length < 2) {
        throw new Error('Not enough participants to start tournament');
    }

    // Sort participants by rank (Elo) to pair similar prowess
    // This is a basic seeding strategy
    const sortedParticipants = tournament.participants.sort((a, b) => b.stats.rankPoints - a.stats.rankPoints);

    const matches = [];
    const matchPromises = [];

    // Simple Single Elim or Pairwise generation
    // For now, let's just generate the first round of matches
    // Create pairs: 1 vs 2, 3 vs 4, etc.
    // Create pairs: 1 vs 2, 3 vs 4, etc.
    try {
        const axios = require('axios');
        const usedPlayers = new Set();

        for (let i = 0; i < sortedParticipants.length; i++) {
            if (usedPlayers.has(sortedParticipants[i]._id.toString())) continue;

            const player1 = sortedParticipants[i];
            let bestOpponent = null;
            let bestOpponentIndex = -1;

            // Try to find a balanced opponent among the next few players
            // Check next 3 players to find best match
            for (let j = i + 1; j < Math.min(i + 4, sortedParticipants.length); j++) {
                if (usedPlayers.has(sortedParticipants[j]._id.toString())) continue;

                const candidate = sortedParticipants[j];

                // ML Check
                const p1WinRate = player1.stats.wins / (player1.stats.matchesPlayed || 1);
                const candWinRate = candidate.stats.wins / (candidate.stats.matchesPlayed || 1);

                try {
                    const { getMLPredictionRaw } = require('../utils/mlService');
                    const pred = await getMLPredictionRaw(
                        player1.stats.rankPoints || 1000,
                        candidate.stats.rankPoints || 1000,
                        p1WinRate,
                        candWinRate
                    );

                    const prob = pred.win_probability;
                    // If balance is decent (0.2 < prob < 0.8), accept immediately
                    if (prob > 0.2 && prob < 0.8) {
                        bestOpponent = candidate;
                        bestOpponentIndex = j;
                        break;
                    }
                } catch (e) {
                    // Ignore ML error, proceed with first available
                }
            }

            // Fallback: If no "balanced" opponent found via ML, just take the next available (Elo sorted)
            if (!bestOpponent) {
                for (let j = i + 1; j < sortedParticipants.length; j++) {
                    if (!usedPlayers.has(sortedParticipants[j]._id.toString())) {
                        bestOpponent = sortedParticipants[j];
                        bestOpponentIndex = j;
                        break;
                    }
                }
            }

            if (bestOpponent) {
                usedPlayers.add(player1._id.toString());
                usedPlayers.add(bestOpponent._id.toString());

                // Fetch final ML Prediction to attach to schema
                const { getMLPredictionRaw } = require('../utils/mlService');
                const finalP1WR = player1.stats.wins / (player1.stats.matchesPlayed || 1);
                const finalP2WR = bestOpponent.stats.wins / (bestOpponent.stats.matchesPlayed || 1);

                const mlPred = await getMLPredictionRaw(
                    player1.stats.rankPoints || 1000,
                    bestOpponent.stats.rankPoints || 1000,
                    finalP1WR,
                    finalP2WR
                );

                const match = new Match({
                    tournament: tournament._id,
                    round: 1,
                    participants: [player1._id, bestOpponent._id],
                    status: 'scheduled',
                    startTime: new Date(),
                    mlPrediction: {
                        win_probability: mlPred.win_probability,
                        confidence_score: mlPred.confidence_score,
                        predicted_winner: mlPred.predicted_winner,
                        risk_level: mlPred.risk_level,
                        is_fallback: mlPred.is_fallback
                    }
                });

                matches.push(match);
                matchPromises.push(match.save());
            }
        }

    } catch (err) {
        console.error("Matchmaking Loop Error", err);
        // Fallback to simple loop if complex logic fails
        for (let i = 0; i < sortedParticipants.length; i += 2) {
            if (i + 1 < sortedParticipants.length) {
                const player1 = sortedParticipants[i];
                const player2 = sortedParticipants[i + 1];

                let mlPred = { win_probability: 0.5, confidence_score: 0.0, predicted_winner: 'p1', risk_level: 'LOW', is_fallback: true };
                try {
                    const { getMLPredictionRaw } = require('../utils/mlService');
                    const finalP1WR = player1.stats.wins / (player1.stats.matchesPlayed || 1);
                    const finalP2WR = player2.stats.wins / (player2.stats.matchesPlayed || 1);
                    mlPred = await getMLPredictionRaw(
                        player1.stats.rankPoints || 1000,
                        player2.stats.rankPoints || 1000,
                        finalP1WR,
                        finalP2WR
                    );
                } catch (mlErr) {
                    console.error("Matchmaking Loop - ML fail block:", mlErr);
                }

                const match = new Match({
                    tournament: tournament._id,
                    round: 1,
                    participants: [player1._id, player2._id],
                    status: 'scheduled',
                    startTime: new Date(),
                    mlPrediction: {
                        win_probability: mlPred.win_probability,
                        confidence_score: mlPred.confidence_score,
                        predicted_winner: mlPred.predicted_winner,
                        risk_level: mlPred.risk_level,
                        is_fallback: mlPred.is_fallback
                    }
                });
                matches.push(match);
                matchPromises.push(match.save());
            }
        }
    }

    const savedMatches = await Promise.all(matchPromises);

    // Update tournament with matches and change status
    tournament.matches = savedMatches.map(m => m._id);
    tournament.status = 'ongoing';
    await tournament.save();

    return savedMatches;
};

module.exports = { generateMatches };
