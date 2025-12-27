const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/auth.middleware');
const { 
    getAdminStats,
    getAllUsers,
    verifyPractitioner, // Changed name to match controller
    getPendingPayouts,
    processPayout 
} = require('../controllers/admin.controller');

router.use(protect);
router.use(admin); 

router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);

// Unified verification route (handles both Accept and Reject via req.body)
router.put('/practitioners/:userId/verify', verifyPractitioner);

router.get('/payouts/pending', getPendingPayouts);
router.put('/payouts/:payoutId/process', processPayout);

module.exports = router;