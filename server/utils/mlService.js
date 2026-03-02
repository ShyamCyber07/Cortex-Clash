const axios = require('axios');
const User = require('../models/User');
const config = require('../config');

/**
 * Reusable ML utility to fetch prediction from FastAPI microservice
 * with fallback to Elo probability if the service fails or times out.
 * 
 * Architecture:
 * - Microservice URL initialized via ENV var (default to Prod render URL).
 * - Implements a 3000ms timeout so a ML service failure doesn't hang the primary Node backend.
 * - Fails open: If ML is unavailable, a pure Elo fallback calculates generic probabilities so 
 *   matches can still be created and processed.
 */

// Use config.mlServiceUrl if it exists, otherwise fall back to environment variable, then hardcoded string
const ML_SERVICE_URL = (config && config.mlServiceUrl) ? config.mlServiceUrl : (process.env.ML_SERVICE_URL || 'https://cortex-clash-1.onrender.com');

const calculateRiskLevel = (confidence_score) => {
    if (confidence_score < 0.2) return 'LOW';
    if (confidence_score <= 0.7) return 'MEDIUM';
    return 'HIGH';
};

/**
 * Explicit core prediction logic
 */
const getMLPredictionRaw = async (p1_rating, p2_rating, p1_win_rate, p2_win_rate) => {
    try {
        const response = await axios.post(`${ML_SERVICE_URL}/predict`, {
            p1_rating: Number(p1_rating),
            p2_rating: Number(p2_rating),
            p1_win_rate: Number(p1_win_rate),
            p2_win_rate: Number(p2_win_rate)
        }, { timeout: 3000 }); // 3 sec execution limit

        const predictionData = response.data; // { win_probability, confidence_score, predicted_winner }

        return {
            ...predictionData,
            risk_level: calculateRiskLevel(predictionData.confidence_score),
            is_fallback: false
        };
    } catch (error) {
        // Log failure but don't crash returning thread
        console.error(`[ML SERVICE ERROR] Fetch prediction failed. Falling back to Elo logic: ${error.message}`);

        // --- Fallback Mechanism: Standard Elo Probability Formula ---
        // PA = 1 / (1 + 10^((RB - RA)/400))
        const p1_prob = 1 / (1 + Math.pow(10, (p2_rating - p1_rating) / 400));
        const p2_prob = 1 - p1_prob;

        const predicted_winner = p1_prob >= 0.5 ? 'p1' : 'p2';
        const win_probability = Math.max(p1_prob, p2_prob);
        // Map [0.5, 1.0] prob to [0, 1] confidence linearly
        const confidence_score = Math.abs(p1_prob - 0.5) * 2;

        return {
            win_probability: Number(win_probability.toFixed(4)),
            confidence_score: Number(confidence_score.toFixed(4)),
            predicted_winner,
            risk_level: calculateRiskLevel(confidence_score),
            is_fallback: true
        };
    }
};

/**
 * Wrapper for database entities. Fetches users from MongoDB and applies prediction in one clean await.
 */
const getPredictionForUsers = async (p1Id, p2Id) => {
    try {
        const p1 = await User.findById(p1Id).lean();
        const p2 = await User.findById(p2Id).lean();

        if (!p1 || !p2) {
            throw new Error("One or both users not found for ML prediction");
        }

        const p1Rating = p1?.stats?.rankPoints || 1000;
        const p2Rating = p2?.stats?.rankPoints || 1000;

        const p1Matches = p1?.stats?.matchesPlayed || 1;
        const p2Matches = p2?.stats?.matchesPlayed || 1;

        const p1WinRate = (p1?.stats?.wins || 0) / Math.max(1, p1Matches);
        const p2WinRate = (p2?.stats?.wins || 0) / Math.max(1, p2Matches);

        return await getMLPredictionRaw(p1Rating, p2Rating, p1WinRate, p2WinRate);

    } catch (err) {
        console.error(`[ML SERVICE WARNING] DB user fetch failed during prediction setup: ${err.message}`);
        // Ultimate fallback
        return {
            win_probability: 0.5,
            confidence_score: 0.0,
            predicted_winner: 'p1',
            risk_level: 'LOW',
            is_fallback: true
        };
    }
}

module.exports = {
    getMLPredictionRaw,
    getPredictionForUsers
};
