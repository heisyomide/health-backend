const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/sendEmail');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

// @desc    Get Single Appointment Details
// @route   GET /api/v1/appointments/:id
// @access  Private
exports.getAppointment = asyncHandler(async (req, res, next) => {
    const appointment = await Appointment.findById(req.params.id)
        .populate('practitioner', 'firstName lastName email')
        .populate('patient', 'firstName lastName email');

    if (!appointment) {
        return next(new ErrorResponse('Appointment not found', 404));
    }

    // Security: Ensure the user belongs to this appointment
    if (appointment.patient._id.toString() !== req.user.id && 
        appointment.practitioner._id.toString() !== req.user.id) {
        return next(new ErrorResponse('Not authorized to view this appointment', 403));
    }

    res.status(200).json({ success: true, data: appointment });
});

// @desc    Reschedule Appointment (Patient Action)
// @route   PATCH /api/v1/appointments/:id/reschedule
exports.rescheduleAppointment = asyncHandler(async (req, res, next) => {
    const { newDate } = req.body;
    let appointment = await Appointment.findById(req.params.id);

    if (!appointment) return next(new ErrorResponse('Appointment not found', 404));

    // Security: Only the patient can reschedule their own appointment
    if (appointment.patient.toString() !== req.user.id) {
        return next(new ErrorResponse('Not authorized', 403));
    }

    appointment.appointmentDate = new Date(newDate);
    appointment.status = 'Pending'; // Reset to pending for practitioner re-approval
    await appointment.save();

    res.status(200).json({ success: true, message: 'Rescheduled successfully', data: appointment });
});

// @desc    Cancel Appointment (Patient Action)
// @route   PATCH /api/v1/appointments/:id/cancel
exports.cancelAppointment = asyncHandler(async (req, res, next) => {
    const { cancellationReason } = req.body;
    let appointment = await Appointment.findById(req.params.id);

    if (!appointment) return next(new ErrorResponse('Appointment not found', 404));

    // Security: Only patient can use this specific cancel route
    if (appointment.patient.toString() !== req.user.id) {
        return next(new ErrorResponse('Not authorized', 403));
    }

    appointment.status = 'Cancelled';
    appointment.cancellationReason = cancellationReason || 'Cancelled by patient';
    await appointment.save();

    res.status(200).json({ success: true, message: 'Appointment cancelled' });
});

// @desc    Get My Appointments (List)
exports.getMyAppointments = asyncHandler(async (req, res, next) => {
    const filter = req.user.role === 'patient' 
        ? { patient: req.user.id } 
        : { practitioner: req.user.id };

    const appointments = await Appointment.find(filter)
        .populate(req.user.role === 'patient' ? 'practitioner' : 'patient', 'firstName lastName email')
        .sort('-appointmentDate');

    res.status(200).json({ success: true, count: appointments.length, data: appointments });
});

// @desc    Book a new appointment (Patient action)
// @route   POST /api/v1/appointments
// @access  Private (Patient)
exports.bookAppointment = asyncHandler(async (req, res, next) => {
    const { practitionerId, appointmentDate, duration, consultationType, notes } = req.body;

    // 1. Check for required fields
    if (!practitionerId || !appointmentDate) {
        return next(new ErrorResponse('Please provide practitionerId and appointmentDate', 400));
    }

    // 2. Verify practitioner exists
    const practitioner = await User.findById(practitionerId);
    if (!practitioner || practitioner.role !== 'practitioner') {
        return next(new ErrorResponse('Practitioner not found', 404));
    }

    // 3. Create the appointment
    const appointment = await Appointment.create({
        patient: req.user._id,
        practitioner: practitionerId,
        appointmentDate: new Date(appointmentDate),
        duration: duration || 30,
        consultationType: consultationType || 'Video',
        notes,
        status: 'Pending', // Default status
    });

    // 4. Send notification email to the Practitioner
    try {
        await sendEmail({
            email: practitioner.email,
            subject: 'New Appointment Request - HealthMe',
            message: `Hi Dr. ${practitioner.lastName},\n\nYou have received a new appointment request from ${req.user.firstName} for ${new Date(appointmentDate).toLocaleString()}.\n\nPlease log in to your dashboard to confirm or reschedule.\n\nRegards,\nHealthMe Team`
        });
    } catch (err) {
        console.error(`Email failed: ${err.message}`);
        // We don't return next(err) here because the appointment is already saved
    }

    res.status(201).json({
        success: true,
        message: 'Appointment booked successfully. Awaiting confirmation.',
        data: appointment
    });
});

/**
 * @desc    Get all appointments for the logged-in practitioner
 * @route   GET /api/v1/appointments
 * @access  Private/Practitioner
 */
exports.getPractitionerAppointments = asyncHandler(async (req, res, next) => {
  // 1. Find appointments where 'practitioner' matches the current user's ID
  // 2. Populate 'patient' to get firstName, lastName, and profile image
  const appointments = await Appointment.find({ practitioner: req.user.id })
    .populate({
      path: "patient",
      select: "firstName lastName profileImage", // Matches your frontend needs
    })
    .sort("-date"); // Sort by newest first

  res.status(200).json({
    success: true,
    count: appointments.length,
    data: appointments,
  });
});

/**
 * @desc    Complete an appointment and trigger escrow release
 * @route   PATCH /api/v1/appointments/:id/complete
 * @access  Private/Practitioner
 */
exports.completeAppointment = asyncHandler(async (req, res, next) => {
  let appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    return next(new ErrorResponse("Appointment not found", 404));
  }

  // Ensure the practitioner owns this appointment
  if (appointment.practitioner.toString() !== req.user.id) {
    return next(new ErrorResponse("Not authorized to update this appointment", 401));
  }

  // Only allow completing if it's currently 'confirmed' or 'pending'
  if (appointment.status === "completed") {
    return next(new ErrorResponse("Appointment is already completed", 400));
  }

  // Update Status
  appointment.status = "completed";
  await appointment.save();

  /**
   * TRIGGER ESCROW RELEASE
   * This calls the internal function we discussed in the roadmap
   * to move funds from pendingBalance to availableBalance.
   */
  // await releaseFundsAndSplit(appointment._id); 

  res.status(200).json({
    success: true,
    message: "Appointment marked as completed. Funds released to wallet.",
    data: appointment,
  });
});