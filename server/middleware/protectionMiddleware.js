const { getSystemState } = require('../services/systemStateService');

const globalMaintenanceCheck = async (req, res, next) => {
    // Intercept mutation operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const { state, reason } = await getSystemState();

        // Let admins override this so they can toggle chaos OFF, fix system, login, etc
        if (req.user && req.user.role === 'admin') {
            return next();
        }

        // Allow user login so people aren't entirely logged out during critical phase
        if (req.path.includes('/login')) {
            return next();
        }

        if (state === 'CRITICAL') {
            return res.status(503).json({
                error: 'SYSTEM_CRITICAL',
                message: 'Platform is in CRITICAL maintenance mode. All write operations are temporarily disabled to prevent data corruption.',
                reason
            });
        }
    }
    next();
};

const blockNewTournaments = async (req, res, next) => {
    const { state, reason } = await getSystemState();
    if (state !== 'NORMAL') {
        return res.status(503).json({
            error: `SYSTEM_${state}`,
            message: 'New tournament creation is currently disabled to prevent queue accumulation during system degradation.',
            reason
        });
    }
    next();
};

const blockEntryFeeRegistration = async (req, res, next) => {
    const { state, reason } = await getSystemState();
    if (state !== 'NORMAL') {
        return res.status(503).json({
            error: `SYSTEM_${state}`,
            message: 'Tournament registration and fee escrow are currently disabled to ensure financial safety during system degradation.',
            reason
        });
    }
    next();
};

module.exports = {
    globalMaintenanceCheck,
    blockNewTournaments,
    blockEntryFeeRegistration
};
