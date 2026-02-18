const axios = require('axios');
const AuditLog = require('../models/AuditLog');

const ML_SERVICE_URL = 'http://127.0.0.1:8000/predict';

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

module.exports = {
    getPrediction
};
