// src/routes/lab.routes.js
const express = require('express');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { 
    uploadLabResult,
    getPatientLabResults
} = require('../controllers/lab.controller');

// IMPORTANT: Assuming you have a file upload middleware (e.g., multer) here
// const upload = require('../middlewares/upload.middleware'); // STUB

const router = express.Router();

// Apply protection to all lab routes
router.use(protect);

// POST /labs/upload (Allowed for patient and practitioner)
router.route('/upload')
    // NOTE: The 'upload.single('file')' middleware would go before uploadLabResult
    .post(authorize('patient', 'practitioner'), uploadLabResult); 

// GET /labs/me (Fetching own results - patient only)
router.route('/me')
    .get(authorize('patient'), getPatientLabResults);

module.exports = router;