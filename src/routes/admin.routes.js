const express = require('express');
const router = express.Router();

// Import Middleware
const { protect, admin, authorize } = require('../middlewares/auth.middleware');

// Import Controller Functions
const { 
    getPractitioners,
    verifyPractitioner,
    getPendingPayouts,
    processPayout,
    getAdminStats,
} = require('../controllers/admin.controller');

// Apply protection to all routes below this line
router.use(protect);

// Use 'admin' or 'authorize' depending on how your middleware is named
// Usually 'admin' middleware checks if req.user.role === 'admin'
router.use(admin || authorize('admin')); 

// --- Dashboard Statistics ---
// Route: GET /api/v1/admin/stats
router.get('/stats', getAdminStats);
// Ensure this exists!
router.get("/users", protect, adminOnly, getAllUsersController);

// --- Practitioner Verification ---
router.route('/practitioners')
    .get(getPractitioners);

router.route('/practitioners/:userId/verify')
    .put(verifyPractitioner);

// --- Payout Management ---
router.route('/payouts/pending')
    .get(getPendingPayouts);

router.route('/payouts/:payoutId/process')
    .put(processPayout);

module.exports = router;