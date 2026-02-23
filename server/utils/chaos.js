const { logger } = require('./logger');

let CHAOS_ENABLED = false;
let chaosTimeoutId = null;

/**
 * Toggles Chaos Mode on or off
 * Automatically disables after TTL (default 10 minutes)
 * @param {boolean} status 
 * @param {number} ttlMinutes 
 */
const toggleChaos = (status, ttlMinutes = 10) => {
    CHAOS_ENABLED = status;

    // Clear any existing reset timer
    if (chaosTimeoutId) {
        clearTimeout(chaosTimeoutId);
        chaosTimeoutId = null;
    }

    if (status) {
        logger.warn(`[CHAOS MODE] System chaos engineering is now ACTIVE. Will auto-disable in ${ttlMinutes}m.`);
        chaosTimeoutId = setTimeout(() => {
            CHAOS_ENABLED = false;
            logger.warn(`[CHAOS MODE] TTL expired. Chaos mode automagically DISABLED.`);
        }, ttlMinutes * 60 * 1000);
    } else {
        logger.warn(`[CHAOS MODE] System chaos engineering is now INACTIVE manually.`);
    }

    return CHAOS_ENABLED;
};

const getChaosStatus = () => CHAOS_ENABLED;

/**
 * Injects a random delay (100ms - 3000ms) or randomly throws an error (20% chance)
 * ONLY executes if CHAOS_ENABLED is true.
 * @param {string} context - The context of the chaos (e.g., 'Escrow', 'Ranking')
 * @param {string} correlationId - Optional correlation ID for tracing
 */
const injectChaos = async (context, correlationId = 'N/A') => {
    if (!CHAOS_ENABLED) return;

    // 20% chance to throw a fatal exception
    if (Math.random() < 0.2) {
        const errorMsg = `[CHAOS EXCEPTION] Simulated fatal fault in ${context}`;
        logger.error(errorMsg, { correlationId, chaosContext: context });
        throw new Error(errorMsg);
    }

    // 30% chance to induce serious latency (100ms to 3000ms)
    if (Math.random() < 0.3) {
        const delay = Math.floor(Math.random() * 2900) + 100;
        logger.warn(`[CHAOS LATENCY] Inducing ${delay}ms delay in ${context}`, { correlationId, chaosContext: context });
        await new Promise(resolve => setTimeout(resolve, delay));
    }
};

module.exports = { toggleChaos, getChaosStatus, injectChaos };
