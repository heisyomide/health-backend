const express = require('express');
const router = express.Router();

// Import Middleware
// NOTE: Using 'admin' as the role checker based on your controller needs
const { protect, admin } = require('../middlewares/auth.middleware');

// Import Controller Functions
const { 
    getAdminStats,
    getAllUsers,
    getPractitioners,
    verifyPractitioner,
    getPendingPayouts,
    processPayout
} = require('../controllers/admin.controller');

// --- Global Protection ---
// All routes below this line require a valid token and Admin role
router.use(protect);
router.use(admin); 

// --- Unified Dashboard Routes ---
router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);

// --- Practitioner Management ---
router.get('/practitioners', getPractitioners);
router.put('/practitioners/:userId/verify', verifyPractitioner);

// --- Payout Management ---
router.get('/payouts/pending', getPendingPayouts);
router.put('/payouts/:payoutId/process', processPayout);

module.exports = router;