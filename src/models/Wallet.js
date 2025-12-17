// src/models/Wallet.js
const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
    practitioner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // Each practitioner has one wallet
    },
    balance: { // Amount available for immediate withdrawal
        type: Number,
        default: 0,
        min: 0
    },
    pendingBalance: { // Amount held in escrow, awaiting completion
        type: Number,
        default: 0,
        min: 0
    },
    totalEarned: { // Lifetime earnings for metrics
        type: Number,
        default: 0,
        min: 0
    },
    lastWithdrawal: Date,
}, { timestamps: true });

module.exports = mongoose.model('Wallet', WalletSchema);