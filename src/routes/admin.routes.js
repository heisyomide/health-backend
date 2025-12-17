// src/routes/admin.routes.js
const express = require('express');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { 
    getPractitioners,
    verifyPractitioner,
    getPendingPayouts,
    processPayout
} = require('../controllers/admin.controller');

const router = express.Router();

// Apply protection and authorization (admin only) to all admin routes
router.use(protect);
router.use(authorize('admin')); 

// --- Practitioner Verification (KYP) ---
router.route('/practitioners')
    .get(getPractitioners); // List all practitioners

router.route('/practitioners/:userId/verify')
    .put(verifyPractitioner); // Approve/Reject profile and licenses

// --- Payout Management ---
router.route('/payouts/pending')
    .get(getPendingPayouts); // List requested payouts

router.route('/payouts/:payoutId/process')
    .put(processPayout); // Process/Mark status of a single payout

module.exports = router;