// src/routes/auth.routes.js
const express = require('express');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { 
    register, 
    login, 
    logout, 
    getMe, 
    updatePassword 
} = require('../controllers/auth.controller');

const router = express.Router();

router.post('/signup', register);
router.post('/login', login);
router.get('/logout', logout);

// --- Phase 0.1 & 0.2 Deliverables ---

// Fetch self (/auth/me) - Must be protected, and requires the user to be logged in (patient or practitioner or admin)
router.get('/me', protect, getMe); 

// Update password - Protected
router.put('/updatepassword', protect, updatePassword);

// Example of future RBAC-controlled route (e.g., Phase 1.1)
// Only users with the 'patient' role can access this route
// router.get('/patient/dashboard', protect, authorize('patient'), patientController.getDashboardData);

// Example for Phase 5 (Admin Platform)
// router.get('/admin/users', protect, authorize('admin'), adminController.getAllUsers);

module.exports = router;