// src/controllers/lab.controller.js
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

const LabResult = require('../models/LabResult');
const User = require('../models/User');

// --- Helper functions for file upload (stubs for simplicity) ---

// This would be your file upload logic using Multer and storage (S3/local)
const handleFileUpload = (req) => {
    // In a real application, this function would return the storage path/URL
    // For now, we stub it with a generic URL based on the file name.
    if (!req.file) {
        throw new ErrorResponse('No file uploaded.', 400);
    }
    return `/uploads/labs/${req.file.filename}`;
};


// @desc    Upload a lab result and attach to a patient
// @route   POST /api/v1/labs/upload
// @access  Private (Patient or Practitioner)
exports.uploadLabResult = asyncHandler(async (req, res, next) => {
    const { patientId, title, dateTaken, notes } = req.body;
    
    // 1. Determine the target patient
    let targetPatientId = patientId;
    if (req.user.role === 'patient') {
        // Patient can only upload for themselves
        targetPatientId = req.user._id; 
    } else if (!targetPatientId) {
        // Practitioners must specify a patientId if they are uploading
        return next(new ErrorResponse('Practitioners must specify a patient ID.', 400));
    }

    // 2. Handle File Upload (STUB)
    // NOTE: In a real implementation, Multer middleware runs BEFORE this controller logic.
    const fileUrl = handleFileUpload(req); 

    // 3. Create the Lab Result Record
    const labResult = await LabResult.create({
        patient: targetPatientId,
        uploadedBy: req.user._id,
        title,
        dateTaken,
        fileUrl,
        notes
    });

    res.status(201).json({
        success: true,
        message: 'Lab result uploaded and linked.',
        data: labResult
    });
});


// @desc    Get all lab results for the current user (Patient)
// @route   GET /api/v1/labs/me
// @access  Private (Patient only)
exports.getPatientLabResults = asyncHandler(async (req, res, next) => {
    const labResults = await LabResult.find({ patient: req.user._id })
        .sort('-dateTaken');

    res.status(200).json({
        success: true,
        count: labResults.length,
        data: labResults
    });
});