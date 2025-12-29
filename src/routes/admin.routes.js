const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  getAdminStats,
  getAllUsers,
  verifyPractitioner,
  getPendingReviews,
  getPendingPayouts,
  processPayout
} = require('../controllers/admin.controller');

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);

router.get('/practitioners/pending', getPendingReviews);
router.put('/practitioners/:userId/verify', verifyPractitioner);

router.get('/payouts/pending', getPendingPayouts);
router.put('/payouts/:payoutId/process', processPayout);

module.exports = router;