const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

router.get('/health', async (req, res, next) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now()
    };
    try {
        // Check DB connection
        if (mongoose.connection.readyState === 1) {
            healthcheck.database = 'OK';
        } else {
            healthcheck.database = 'DISCONNECTED';
            res.status(503);
        }
        res.send(healthcheck);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
