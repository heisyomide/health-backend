const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

const PractitionerProfile = require("../models/PractitionerProfile");
const Availability = require("../models/Availability");
const Appointment = require("../models/Appointment");
const Diagnosis = require("../models/Diagnosis");
const Prescription = require("../models/Prescription");
const User = require("../models/User");
const { uploadToCloudinary } = require("../utils/cloudinary");
const fs = require("fs");
/* =====================================================
   PRACTITIONER ONBOARDING
===================================================== */
// Ensure this is inside the exports.onboardPractitioner function


exports.onboardPractitioner = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { licenseDocument, specialization, licenseNumber, ninNumber, bio } = req.body;

  if (!licenseDocument) {
    return next(new ErrorResponse("License URL is required", 400));
  }

  // Update or Create profile
  const profile = await PractitionerProfile.findOneAndUpdate(
    { user: userId },
    { 
      ...req.body, // Contains specialization, licenseNumber, etc.
      licenseDocument, // The Cloudinary URL string
      nextOfKin: {
        name: req.body.nextOfKinName,
        phone: req.body.nextOfKinPhone,
      }
    },
    { new: true, upsert: true }
  );

  await User.findByIdAndUpdate(userId, {
    onboardingCompleted: true,
    verificationStatus: "pending",
  });

  res.status(200).json({
    success: true,
    message: "Onboarding successful. No more SSL errors!"
  });
});
 

// <--- Make sure this bracket closes the function properly
/* =====================================================
   GET PRACTITIONER PROFILE
===================================================== */
exports.getPractitionerData = asyncHandler(async (req, res, next) => {
  const profile = await PractitionerProfile.findOne({
    user: req.user._id,
  });

  if (!profile) {
    return next(new ErrorResponse("Practitioner profile not found", 404));
  }

  const availability = await Availability.findOne({
    practitioner: req.user._id,
  });

  res.status(200).json({
    success: true,
    data: {
      profile,
      availability: availability || null,
    },
  });
});

/* =====================================================
   UPDATE PRACTITIONER PROFILE
===================================================== */
exports.updatePractitionerProfile = asyncHandler(async (req, res, next) => {
  const allowedFields = [
    "firstName",
    "lastName",
    "specialization",
    "licenseNumber",
    "phoneNumber",
    "address",
    "hospitalAffiliation",
    "bio",
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const profile = await PractitionerProfile.findOneAndUpdate(
    { user: req.user._id },
    updates,
    { new: true, runValidators: true }
  );

  if (!profile) {
    return next(new ErrorResponse("Practitioner profile not found", 404));
  }

  res.status(200).json({
    success: true,
    data: profile,
  });
});

/* =====================================================
   UPDATE AVAILABILITY
===================================================== */
exports.updateAvailability = asyncHandler(async (req, res) => {
  const { schedule, unavailableDates } = req.body;

  const availability = await Availability.findOneAndUpdate(
    { practitioner: req.user._id },
    { schedule, unavailableDates },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: availability,
  });
});

/* =====================================================
   SUBMIT DIAGNOSIS
===================================================== */
exports.submitDiagnosis = asyncHandler(async (req, res, next) => {
  const {
    appointmentId,
    subjective,
    objective,
    assessment,
    plan,
    chiefComplaint,
  } = req.body;

  const appointment = await Appointment.findById(appointmentId);

  if (!appointment || appointment.status !== "Completed") {
    return next(
      new ErrorResponse(
        "Diagnosis can only be submitted for completed appointments",
        400
      )
    );
  }

  if (appointment.practitioner.toString() !== req.user.id) {
    return next(new ErrorResponse("Not authorized", 403));
  }

  const existing = await Diagnosis.findOne({ appointment: appointmentId });
  if (existing) {
    return next(new ErrorResponse("Diagnosis already exists", 400));
  }

  const diagnosis = await Diagnosis.create({
    appointment: appointmentId,
    patient: appointment.patient,
    practitioner: req.user._id,
    subjective,
    objective,
    assessment,
    plan,
    chiefComplaint,
  });

  res.status(201).json({
    success: true,
    data: diagnosis,
  });
});

/* =====================================================
   ISSUE PRESCRIPTION
===================================================== */
exports.issuePrescription = asyncHandler(async (req, res, next) => {
  const { diagnosisId, medications } = req.body;

  const diagnosis = await Diagnosis.findById(diagnosisId);

  if (!diagnosis || diagnosis.practitioner.toString() !== req.user.id) {
    return next(new ErrorResponse("Diagnosis not found or unauthorized", 404));
  }

  const prescription = await Prescription.create({
    diagnosis: diagnosisId,
    patient: diagnosis.patient,
    practitioner: req.user._id,
    medications,
  });

  res.status(201).json({
    success: true,
    data: prescription,
  });
});

/* =====================================================
   PRACTITIONER DASHBOARD
===================================================== */
exports.getPractitionerDashboard = asyncHandler(async (req, res, next) => {
  const profile = await PractitionerProfile.findOne({
    user: req.user._id,
  });

  if (!profile) {
    return next(new ErrorResponse("Practitioner profile not found", 404));
  }

  const upcomingAppointments = await Appointment.find({
    practitioner: req.user._id,
    status: { $in: ["Scheduled", "Confirmed"] },
  })
    .sort({ date: 1 })
    .limit(5)
    .populate("patient", "fullName");

  const completedAppointments = await Appointment.countDocuments({
    practitioner: req.user._id,
    status: "Completed",
  });

  const activePatients = await Appointment.distinct("patient", {
    practitioner: req.user._id,
    status: "Completed",
  });

  res.status(200).json({
    success: true,
    data: {
      profile: {
        fullName: `${profile.firstName} ${profile.lastName}`,
        specialization: profile.specialization,
        isVerified: req.user.isVerified,
      },
      stats: {
        totalPatients: activePatients.length,
        completedAppointments,
      },
      upcomingAppointments,
      wallet: {
        balance: 0,
        currency: "NGN",
      },
    },
  });
});
exports.confirmServiceDone = asyncHandler(async (req, res, next) => {
  const { appointmentId, note } = req.body;

  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    return next(new ErrorResponse("Appointment not found", 404));
  }

  if (appointment.practitioner.toString() !== req.user.id) {
    return next(new ErrorResponse("Not authorized", 403));
  }

  if (appointment.status !== "PAID") {
    return next(new ErrorResponse("Invalid appointment state", 400));
  }

  appointment.status = "PRACTITIONER_CONFIRMED";
  appointment.practitionerConfirmedAt = new Date();
  appointment.completionEvidence = {
    practitionerNote: note,
  };

  await appointment.save();

  res.status(200).json({ success: true });
});
// controllers/cloudinary.controller.js
const cloudinary = require('cloudinary').v2;
const asyncHandler = require('../utils/asyncHandler');

exports.getCloudinarySignature = asyncHandler(async (req, res) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  // This signs the request so Cloudinary knows it's coming from YOUR app
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder: 'practitioner_licenses',
    },
    process.env.CLOUDINARY_API_SECRET
  );

  res.status(200).json({
    success: true,
    data: {
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    }
  });
});