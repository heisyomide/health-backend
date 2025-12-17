// src/routes/patient.routes.js
const express = require('express');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { 
    getPatientData,
    updatePatientProfile,
    getMedicalHistory,
    updateMedicalHistory
} = require('../controllers/patient.controller');

const router = express.Router();

// All routes here must be protected and restricted to the 'patient' role
router.use(protect);
router.use(authorize('patient')); 

// Phase 1.1 APIs
// GET   /patients/me
// PUT   /patients/me
router.route('/me')
    .get(getPatientData)
    .put(updatePatientProfile);

// GET   /patients/medical-history
// POST  /patients/medical-history
router.route('/medical-history')
    .get(getMedicalHistory)
    .post(updateMedicalHistory);

module.exports = router;