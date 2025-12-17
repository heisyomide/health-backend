// src/controllers/patient.controller.js
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

const PatientProfile = require('../models/PatientProfile');
const MedicalHistory = require('../models/MedicalHistory');
const User = require('../models/User'); // Used for population

// @desc    Get the logged-in patient's profile and core medical data
// @route   GET /api/v1/patients/me
// @access  Private (Patient only)
exports.getPatientData = asyncHandler(async (req, res, next) => {
    // req.user is available via 'protect' middleware
    const patientProfile = await PatientProfile.findOne({ user: req.user._id })
        .populate('user', 'email role'); // Optionally populate user details

    if (!patientProfile) {
        return next(new ErrorResponse('Patient profile not found', 404));
    }

    const medicalHistory = await MedicalHistory.findOne({ user: req.user._id });

    res.status(200).json({
        success: true,
        data: {
            profile: patientProfile,
            medicalHistory: medicalHistory || {} // Return empty if none exists yet
        }
    });
});

// @desc    Update the logged-in patient's profile
// @route   PUT /api/v1/patients/me
// @access  Private (Patient only)
exports.updatePatientProfile = asyncHandler(async (req, res, next) => {
    // Note: We only allow updates to the PatientProfile, not the core User model (email/password)
    const updateFields = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        dateOfBirth: req.body.dateOfBirth,
        gender: req.body.gender,
        contactNumber: req.body.contactNumber,
        address: req.body.address
    };

    const patientProfile = await PatientProfile.findOneAndUpdate(
        { user: req.user._id },
        updateFields,
        { new: true, runValidators: true }
    );

    if (!patientProfile) {
        // This case should not happen if registration was correct, but good to handle
        return next(new ErrorResponse('Patient profile not found for update.', 404));
    }

    res.status(200).json({
        success: true,
        data: patientProfile
    });
});


// @desc    Get the logged-in patient's medical history
// @route   GET /api/v1/patients/medical-history
// @access  Private (Patient only)
exports.getMedicalHistory = asyncHandler(async (req, res, next) => {
    const medicalHistory = await MedicalHistory.findOne({ user: req.user._id });
    
    if (!medicalHistory) {
        // If they don't have one, we can create an empty one for them
        const newHistory = await MedicalHistory.create({ user: req.user._id });
        return res.status(200).json({ success: true, data: newHistory });
    }

    res.status(200).json({
        success: true,
        data: medicalHistory
    });
});


// @desc    Create/Update the logged-in patient's medical history (Allergies, Conditions, Medications)
// @route   POST /api/v1/patients/medical-history
// @access  Private (Patient only)
exports.updateMedicalHistory = asyncHandler(async (req, res, next) => {
    const { allergies, conditions, medications, lastUpdatedVitals } = req.body;

    const updateFields = {
        // Only update fields that are explicitly sent in the body
        ...(allergies && { allergies }),
        ...(conditions && { conditions }),
        ...(medications && { medications }),
        ...(lastUpdatedVitals && { lastUpdatedVitals })
    };

    const medicalHistory = await MedicalHistory.findOneAndUpdate(
        { user: req.user._id },
        { $set: updateFields },
        { new: true, upsert: true, runValidators: true } // 'upsert: true' creates the document if it doesn't exist
    );

    res.status(200).json({
        success: true,
        data: medicalHistory
    });
});