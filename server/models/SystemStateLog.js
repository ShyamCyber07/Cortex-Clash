const mongoose = require('mongoose');

const systemStateLogSchema = new mongoose.Schema({
    previousState: {
        type: String,
        required: true,
        enum: ['NORMAL', 'DEGRADED', 'CRITICAL']
    },
    newState: {
        type: String,
        required: true,
        enum: ['NORMAL', 'DEGRADED', 'CRITICAL']
    },
    triggerMetric: {
        type: String,
        required: true
    },
    snapshotMetrics: {
        type: Object,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('SystemStateLog', systemStateLogSchema);
