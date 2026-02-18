const mongoose = require('mongoose');

const seasonSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: false },
    games: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Game' }], // Games included in this season
    rules: { type: String } // General seasons rules
}, { timestamps: true });

// Ensure only one season is active at a time
seasonSchema.pre('save', async function () {
    if (this.isActive) {
        const Season = this.constructor;
        await Season.updateMany(
            { _id: { $ne: this._id }, isActive: true },
            { $set: { isActive: false } }
        );
    }
});

module.exports = mongoose.model('Season', seasonSchema);
