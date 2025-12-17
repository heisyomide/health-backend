// src/models/Payout.js
const mongoose = require('mongoose');

const PayoutSchema = new mongoose.Schema({
    practitioner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01
    },
    // The account details used for this specific payout
    bankDetails: {
        bankName: String,
        accountNumber: String,
        accountName: String, // From KYC/PractitionerProfile
    },
    status: {
        type: String,
        enum: ['requested', 'processing', 'completed', 'failed'],
        default: 'requested',
    },
    requestedAt: {
        type: Date,
        default: Date.now,
    },
    processedAt: Date, // When the admin/system initiated the bank transfer
    externalReference: String, // Reference ID from the bank/payment processor
    adminNotes: String,
}, { timestamps: true });

module.exports = mongoose.model('Payout', PayoutSchema);