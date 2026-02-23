const mongoose = require('mongoose');

const workerStatusSchema = new mongoose.Schema({
    workerId: { type: String, required: true, unique: true },
    queues: [{ type: String }],
    memoryUsage: { type: mongoose.Schema.Types.Mixed },
    lastSeen: { type: Date, default: Date.now, index: { expires: '5m' } } // Auto-remove dead workers after 5 mins
}, { timestamps: true });

module.exports = mongoose.model('WorkerStatus', workerStatusSchema);
