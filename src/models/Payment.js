// src/models/Payment.js
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true,
        unique: true // One payment per appointment
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    practitioner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Flutterwave Fields
    flwTransactionId: { // ID provided by Flutterwave on success
        type: String,
        required: true,
        unique: true
    },
    flwReference: { // tx_ref used to initiate the payment
        type: String,
        required: true,
    },
    // Financial Amounts
    grossAmount: { // Total amount patient paid (₦20,000 + fees)
        type: Number,
        required: true,
    },
    flutterwaveFee: {
        type: Number,
        default: 0
    },
    platformFee: { // 10% commission (₦2,000)
        type: Number,
        required: true,
    },
    practitionerShare: { // 90% payout (₦18,000)
        type: Number,
        required: true,
    },
    // Escrow Status
    status: {
        type: String,
        enum: ['initiated', 'held', 'completed', 'refunded'],
        default: 'initiated', // Initial status after successful verification
    },
    paidAt: { // Date the patient completed the payment
        type: Date,
        default: Date.now
    },
    releasedAt: Date, // Date the payment was moved to the practitioner's wallet
}, { timestamps: true });


module.exports = mongoose.model('Payment', PaymentSchema);