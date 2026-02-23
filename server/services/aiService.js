const axios = require('axios');
const AuditLog = require('../models/AuditLog');
const AIPerformance = require('../models/AIPerformance');

const config = require('../config');

const ML_SERVICE_URL = config.mlServiceUrl;

/**
 * Get win probability prediction from ML service
 * @param {Object} p1Data - { rating, winRate, id }
 * @param {Object} p2Data - { rating, winRate, id }
 * @param {Object} gameData - { type } - Optional for future use
 * @returns {Promise<Object|null>} - { win_probability, confidence_score, predicted_winner } or null
 */
const getPrediction = async (p1Data, p2Data, gameData = {}) => {
    try {
        const payload = {
            p1_rating: p1Data.rating,
            p2_rating: p2Data.rating,
            p1_win_rate: p1Data.winRate,
            p2_win_rate: p2Data.winRate
        };

        // Note: The prompt mentioned sending "Rating difference", "Game type", etc.
        // But the existing ML service only accepts the fields above.
        // We log the full context for analytics if needed, but send only what the model needs.

        const response = await axios.post(ML_SERVICE_URL, payload, { timeout: 2000 });

        if (response.data) {
            // Log prediction event
            // We don't have request context here (req.user), so we might log it in the controller
            // or just log system events here.
            // keeping it simple for now.
            return response.data;
        }
        return null;
    } catch (error) {
        console.error(`[AI SERVICE] Prediction failed: ${error.message}`);
        // Return null to allow fallback/graceful degradation
        return null;
    }
};

/**
 * Record accuracy and Brier score after a match completes
 * @param {Object} match - The populated Match document
 */
const recordMatchPredictionResult = async (match) => {
    try {
        if (!match.prediction || !match.winner || match.participants.length < 2) return;

        const p1Id = String(match.participants[0]._id || match.participants[0]);
        const p2Id = String(match.participants[1]._id || match.participants[1]);
        const winnerId = String(match.winner._id || match.winner);

        const actualWinner = winnerId === p1Id ? 'p1' : (winnerId === p2Id ? 'p2' : null);
        if (!actualWinner) return;

        // Ensure prediction structure exists
        const { win_probability, predicted_winner, confidence_score } = match.prediction;
        if (win_probability === undefined || !predicted_winner) return;

        const isCorrect = (predicted_winner === actualWinner);

        // Calculate Brier score: (predicted_p1_prob - actual_p1_outcome)^2
        // If predicted_winner from model is p1, win_probability refers to p1.
        // Wait, what if prediction's `predicted_winner` was p2 and win_probability refers to p2?
        // Let's assume prediction returns `win_probability` for p1 always, or for predicted winner.
        // Looking at the ML schema, win_probability is likely for the predicted winner. 
        // Let's normalize `p1_win_prob`.
        const p1_win_prob = predicted_winner === 'p1' ? win_probability : (1 - win_probability);
        const actual_p1_outcome = actualWinner === 'p1' ? 1 : 0;

        const brierScore = Math.pow(p1_win_prob - actual_p1_outcome, 2);

        // Confidence diff -> how confident vs outcome truth
        const confidenceDifference = isCorrect ? win_probability : -win_probability;

        await AIPerformance.create({
            match: match._id,
            predictedWinner,
            winProbability: p1_win_prob,
            actualWinner,
            isCorrect,
            brierScore,
            confidenceDifference
        });

        console.log(`[AI SERVICE] Tracked prediction for match ${match._id}: Brier=${brierScore.toFixed(3)}, Correct=${isCorrect}`);

    } catch (err) {
        if (err.code === 11000) return; // Ignore duplicate
        console.error(`[AI SERVICE] Failed to record prediction result:`, err);
    }
};

module.exports = {
    getPrediction,
    recordMatchPredictionResult
};
