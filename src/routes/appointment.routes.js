// src/routes/appointment.routes.js
const express = require('express');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { 
    bookAppointment,
    getMyAppointments,
    updateAppointmentStatus
} = require('../controllers/appointment.controller');

const router = express.Router();

// Apply protection to all appointment routes
router.use(protect);

// POST /appointments (Booking - requires patient role)
router.route('/')
    .post(authorize('patient'), bookAppointment);

// GET /appointments/me (Fetching appointments - allowed for patient and practitioner)
router.route('/me')
    .get(authorize('patient', 'practitioner'), getMyAppointments);

// PUT /appointments/:id/status (Updating status/cancellation - allowed for patient and practitioner)
router.route('/:id/status')
    .put(authorize('patient', 'practitioner'), updateAppointmentStatus);

module.exports = router;