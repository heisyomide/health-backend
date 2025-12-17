// src/routes/payment.routes.js
const express = require('express');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { 
    initiateAppointmentPayment,
    handleWebhook,
    requestWithdrawal,
    getWalletStatus
} = require('../controllers/payment.controller');

const router = express.Router();

// --- Core Payment & Webhook Routes (Phase 4.1 & 4.2) ---

// 1. Initiate Payment (Patient action to pay for appointment)
// POST /api/v1/payments/initiate
router.route('/initiate')
    .post(protect, authorize('patient'), initiateAppointmentPayment);

// 2. Flutterwave Webhook (Public route for Flutterwave server to hit)
// POST /api/v1/payments/webhook
router.route('/webhook')
    .post(handleWebhook); // Note: No 'protect' middleware here

// --- Practitioner Wallet & Payout Routes (Phase 4.3) ---

// 3. Get Wallet Status (Balance, Pending, Total Earned)
// GET /api/v1/payments/wallet
router.route('/wallet')
    .get(protect, authorize('practitioner'), getWalletStatus);

// 4. Request Withdrawal
// POST /api/v1/payments/withdraw
router.route('/withdraw')
    .post(protect, authorize('practitioner'), requestWithdrawal);

module.exports = router;