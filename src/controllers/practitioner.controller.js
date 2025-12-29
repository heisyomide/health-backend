// src/controllers/practitioner.controller.js
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

const PractitionerProfile = require('../models/PractitionerProfile');
const Availability = require('../models/Availability');
const Appointment = require('../models/Appointment');
const Diagnosis = require('../models/Diagnosis');
const Prescription = require('../models/Prescription');
const User = require('../models/User');
const { uploadToCloudinary } = require('../utils/cloudinary'); // Assuming you use Cloudinary


exports.onboardPractitioner = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  if (!req.file) {
    return next(new ErrorResponse('Medical license is required', 400));
  }

  const upload = await uploadToCloudinary(
    req.file.path,
    'practitioner_licenses'
  );

  const profile = await PractitionerProfile.findOneAndUpdate(
    { user: userId },
    {
      specialization: req.body.specialization,
      licenseNumber: req.body.licenseNumber,
      ninNumber: req.body.ninNumber,
      phoneNumber: req.body.phoneNumber,
      address: req.body.address,
      hospitalAffiliation: req.body.hospitalAffiliation,
      bio: req.body.bio,
      licenseDocument: upload.secure_url,
      nextOfKin: {
        name: req.body.nextOfKinName,
        phone: req.body.nextOfKinPhone
      }
    },
    { new: true, runValidators: true }
  );

  if (!profile) {
    return next(new ErrorResponse('Practitioner profile not found', 404));
  }

  await User.findByIdAndUpdate(userId, {
    onboardingCompleted: true,
    verificationStatus: 'pending',
    isVerified: false
  });

  res.status(200).json({
    success: true,
    message: 'Onboarding submitted. Awaiting admin review.'
  });
});

// @desc    Get the logged-in practitioner's profile and availability
// @route   GET /api/v1/practitioners/me
// @access  Private (Practitioner only)
exports.getPractitionerData = asyncHandler(async (req, res, next) => {
  const profile = await PractitionerProfile.findOne({
    user: req.user._id
  });

  if (!profile) {
    return next(new ErrorResponse('Practitioner profile not found', 404));
  }

  const availability = await Availability.findOne({
    practitioner: req.user._id
  });

  res.status(200).json({
    success: true,
    data: { profile, availability }
  });
});
// @desc    Update the logged-in practitioner's profile (Specialization, License, etc.)
// @route   PUT /api/v1/practitioners/me
// @access  Private (Practitioner only)
exports.updatePractitionerProfile = asyncHandler(async (req, res, next) => {
    const updateFields = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        specialization: req.body.specialization,
        licenseNumber: req.body.licenseNumber,
        contactNumber: req.body.contactNumber,
        clinicAddress: req.body.clinicAddress
    };
    
    // Find and update the profile
    const profile = await PractitionerProfile.findOneAndUpdate(
        { user: req.user._id },
        updateFields,
        { new: true, runValidators: true }
    );

    if (!profile) {
        return next(new ErrorResponse('Practitioner profile not found for update.', 404));
    }

    res.status(200).json({
        success: true,
        data: profile
    });
});

// @desc    Update practitioner availability schedule
// @route   POST /api/v1/practitioners/availability
// @access  Private (Practitioner only)
exports.updateAvailability = asyncHandler(async (req, res, next) => {
    const { schedule, unavailableDates } = req.body;

    const availability = await Availability.findOneAndUpdate(
        { practitioner: req.user._id },
        { schedule, unavailableDates },
        { new: true, upsert: true, runValidators: true } 
    );

    res.status(200).json({
        success: true,
        data: availability
    });
});


// @desc    Submit a diagnosis and treatment plan for a completed appointment
// @route   POST /api/v1/practitioners/diagnoses
// @access  Private (Practitioner only)
exports.submitDiagnosis = asyncHandler(async (req, res, next) => {
    const { appointmentId, subjective, objective, assessment, plan, chiefComplaint } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment || appointment.status !== 'Completed') {
        return next(new ErrorResponse('Diagnosis can only be submitted for completed appointments.', 400));
    }

    if (appointment.practitioner.toString() !== req.user.id) {
        return next(new ErrorResponse('Not authorized to submit diagnosis for this appointment.', 403));
    }
    
    const existingDiagnosis = await Diagnosis.findOne({ appointment: appointmentId });
    if (existingDiagnosis) {
        return next(new ErrorResponse('Diagnosis already exists for this appointment.', 400));
    }

    const diagnosis = await Diagnosis.create({
        appointment: appointmentId,
        patient: appointment.patient,
        practitioner: req.user._id,
        subjective, objective, assessment, plan, chiefComplaint
    });

    res.status(201).json({
        success: true,
        message: 'Diagnosis and treatment plan recorded.',
        data: diagnosis
    });
});


// @desc    Issue a prescription tied to a diagnosis
// @route   POST /api/v1/practitioners/prescriptions
// @access  Private (Practitioner only)
exports.issuePrescription = asyncHandler(async (req, res, next) => {
    const { diagnosisId, medications } = req.body;

    const diagnosis = await Diagnosis.findById(diagnosisId);
    if (!diagnosis || diagnosis.practitioner.toString() !== req.user.id) {
        return next(new ErrorResponse('Diagnosis not found or not authorized.', 404));
    }

    const prescription = await Prescription.create({
        diagnosis: diagnosisId,
        patient: diagnosis.patient,
        practitioner: req.user._id,
        medications: medications 
    });

    res.status(201).json({
        success: true,
        message: 'Prescription issued successfully.',
        data: prescription
    });
});
// @desc    Get practitioner dashboard summary
// @route   GET /api/v1/practitioners/dashboard
// @access  Private (Practitioner only)
exports.getPractitionerDashboard = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const profile = await PractitionerProfile.findOne({ user: user._id });

  if (!profile) {
    return next(new ErrorResponse('Practitioner profile not found', 404));
  }

  const upcomingAppointments = await Appointment.find({
    practitioner: user._id,
    status: { $in: ['Scheduled', 'Confirmed'] }
  })
    .sort({ date: 1 })
    .limit(5)
    .populate('patient', 'fullName');

  const completedAppointments = await Appointment.countDocuments({
    practitioner: user._id,
    status: 'Completed'
  });

  const activePatients = await Appointment.distinct('patient', {
    practitioner: user._id,
    status: 'Completed'
  });

  res.status(200).json({
    success: true,
    data: {
      profile: {
        fullName: `${profile.firstName} ${profile.lastName}`,
        specialization: profile.specialization,
        isVerified: user.isVerified
      },
      stats: {
        totalPatients: activePatients.length,
        completedAppointments
      },
      upcomingAppointments,
      wallet: {
        balance: 0,
        currency: 'NGN'
      }
    }
  });
});