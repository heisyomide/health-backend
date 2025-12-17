// src/routes/practitioner.routes.js
const express = require('express');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { 
    getPractitionerData,
    updatePractitionerProfile,
    updateAvailability,
    submitDiagnosis,
    issuePrescription
} = require('../controllers/practitioner.controller');

const router = express.Router();

// Middleware applied to ALL practitioner routes
router.use(protect);
router.use(authorize('practitioner')); 

// Phase 1.2 APIs
router.route('/me')
    .get(getPractitionerData)
    .put(updatePractitionerProfile);

router.route('/availability')
    .post(updateAvailability);
    
// Phase 2.2 Diagnosis & Treatment APIs
router.route('/diagnoses')
    .post(submitDiagnosis);

router.route('/prescriptions')
    .post(issuePrescription);

// Future Phase 2/5 routes will be added here (e.g., /patients, /appointments)

module.exports = router;