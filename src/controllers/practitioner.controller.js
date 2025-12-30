const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

const PractitionerProfile = require("../models/PractitionerProfile");
const Availability = require("../models/Availability");
const Appointment = require("../models/Appointment");
const Diagnosis = require("../models/Diagnosis");
const Prescription = require("../models/Prescription");
const User = require("../models/User");
const { uploadToCloudinary } = require("../utils/cloudinary");

/* =====================================================
   PRACTITIONER ONBOARDING
===================================================== */
// Ensure this is inside the exports.onboardPractitioner function
exports.onboardPractitioner = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // 1. Validate File Existence
  if (!req.file) {
    return next(new ErrorResponse("Medical license document is required", 400));
  }

  // 2. Find or Create Practitioner Profile
  let profile = await PractitionerProfile.findOne({ user: userId });
  if (!profile) {
    profile = new PractitionerProfile({ user: userId });
  }

  // 3. Upload to Cloudinary
  const upload = await uploadToCloudinary(
    req.file.path,
    "practitioner_licenses"
  );

  // 4. Safety Check: Ensure Cloudinary didn't return null
  if (!upload || !upload.secure_url) {
    return next(new ErrorResponse("Cloudinary upload failed. Please check server logs.", 500));
  }

  // 5. Map Data to Profile (Matching your frontend names)
  Object.assign(profile, {
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
      phone: req.body.nextOfKinPhone,
    },
  });

  // 6. Execute Database Updates
  // We use Promise.all to run these at the same time for speed
  await Promise.all([
    profile.save(),
    User.findByIdAndUpdate(userId, {
      onboardingCompleted: true,
      verificationStatus: "pending",
      isVerified: false,
    })
  ]);

  // 7. Success Response
  res.status(200).json({
    success: true,
    message: "Onboarding submitted successfully. Awaiting admin review.",
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
exports.confirmServiceDone = asyncHandler(async (req, res) => {
  const { appointmentId, note } = req.body;

  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    throw new ErrorResponse('Appointment not found', 404);
  }

  if (appointment.practitioner.toString() !== req.user.id) {
    throw new ErrorResponse('Not authorized', 403);
  }

  if (appointment.status !== 'PAID') {
    throw new ErrorResponse('Invalid appointment state', 400);
  }

  appointment.status = 'PRACTITIONER_CONFIRMED';
  appointment.practitionerConfirmedAt = new Date();
  appointment.completionEvidence.practitionerNote = note;

  await appointment.save();

  res.json({ success: true });
});
