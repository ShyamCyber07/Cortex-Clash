const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // e.g., 'MATCH_SUBMISSION', 'MATCH_CONFIRMATION'
    resourceType: { type: String, required: true }, // e.g., 'Match', 'Tournament'
    resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    details: { type: Object }, // Flexible JSON for specific changes
    ip: { type: String },
    device: { type: String }
}, {
    timestamps: true
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
