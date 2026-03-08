const mongoose = require('mongoose');
const teamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    captain: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    inviteCode: { type: String, unique: true },
    maxMembers: { type: Number, default: 4 }
}, { timestamps: true });

// Pre-save hook to generate invite code automatically
teamSchema.pre('save', function (next) {
    if (!this.inviteCode) {
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.inviteCode = `CC-${random}`;
    }
    next();
});

module.exports = mongoose.model('Team', teamSchema);
