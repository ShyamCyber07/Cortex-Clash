const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['deposit', 'withdrawal', 'entry_fee', 'prize_payout', 'refund'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'CRX' },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
    referenceId: { type: mongoose.Schema.Types.ObjectId }, // e.g., Tournament ID or External Payment ID
    referenceModel: { type: String, enum: ['Tournament', 'Match', 'External'] },
    previousBalance: { type: Number },
    newBalance: { type: Number },
    idempotencyKey: { type: String, unique: true, sparse: true },
    notes: { type: String }
}, { timestamps: true });

transactionSchema.index({ user: 1, createdAt: -1 });

// Ensure only one prize payout transaction is created per tournament 
transactionSchema.index(
    { referenceId: 1, type: 1 },
    { unique: true, partialFilterExpression: { type: 'prize_payout' } }
);

module.exports = mongoose.model('Transaction', transactionSchema);
