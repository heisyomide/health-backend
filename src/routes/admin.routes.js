const express = require('express');
const router = express.Router();

// Middleware
const { protect, admin } = require('../middlewares/auth.middleware');

// Controllers
const {
  getAdminStats,
  getAllUsers,
  verifyUser,          // ✅ unified accept / reject
  getPendingPayouts,
  processPayout
} = require('../controllers/admin.controller');

// ---------------- PROTECTION ----------------
router.use(protect);
router.use(admin);

// ---------------- DASHBOARD ----------------
router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);

// ---------------- VERIFICATION ----------------
// Accept / Reject practitioner
router.patch('/users/:userId/verify', verifyUser);

// ---------------- PAYOUTS ----------------
router.get('/payouts/pending', getPendingPayouts);
router.put('/payouts/:payoutId/process', processPayout);

module.exports = router;