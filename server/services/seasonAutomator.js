const Season = require('../models/Season');
const User = require('../models/User');
const { invalidateIntegrityCache } = require('../utils/cache');

/**
 * Automate global score resets when a new season activates.
 */
const applySeasonRollover = async () => {
    try {
        // Halve the suspicion score for all users with a score > 0
        await User.updateMany(
            { 'integrity.suspicionScore': { $gt: 0 } },
            [{ $set: { 'integrity.suspicionScore': { $round: [{ $multiply: ['$integrity.suspicionScore', 0.5] }, 2] } } }]
        );
        // Unflag users who fell below the 50 point threshold
        await User.updateMany(
            { 'integrity.suspicionScore': { $lt: 50 }, 'integrity.isFlagged': true },
            { $set: { 'integrity.isFlagged': false } }
        );
        invalidateIntegrityCache();
        console.log('[SEASON] Rollover: Suspicion scores halved globally.');
    } catch (err) {
        console.error('[SEASON ERROR] Failed to apply season rollover:', err);
    }
};

/**
 * Check if the active season has ended, and if so, try to activate the next one.
 */
const checkAndResetSeasons = async () => {
    try {
        const now = new Date();
        const activeSeason = await Season.findOne({ isActive: true });

        if (activeSeason && activeSeason.endDate && new Date(activeSeason.endDate) <= now) {
            console.log(`[SEASON AUTOMATOR] Active season "${activeSeason.name}" has expired.`);

            // Deactivate
            activeSeason.isActive = false;
            await activeSeason.save();

            // Find next season
            const nextSeason = await Season.findOne({ isActive: false, startDate: { $lte: now }, endDate: { $gt: now } }).sort({ startDate: 1 });

            if (nextSeason) {
                console.log(`[SEASON AUTOMATOR] Automatically activating next season: "${nextSeason.name}"...`);
                nextSeason.isActive = true;
                await nextSeason.save();
                await applySeasonRollover();
            } else {
                console.log(`[SEASON AUTOMATOR] No upcoming season scheduled to take over.`);
            }
        }
    } catch (err) {
        console.error('[SEASON AUTOMATOR] Failed to check and reset seasons:', err);
    }
};

module.exports = {
    applySeasonRollover,
    checkAndResetSeasons
};
