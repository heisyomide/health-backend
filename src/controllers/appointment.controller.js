// src/controllers/appointment.controller.js
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

const Appointment = require('../models/Appointment');
const Availability = require('../models/Availability');
const PractitionerProfile = require('../models/PractitionerProfile');

// --- Helper function for Phase 2.1 APIs ---

// @desc    Book a new appointment (Patient action)
// @route   POST /api/v1/appointments
// @access  Private (Patient only)
exports.bookAppointment = asyncHandler(async (req, res, next) => {
    const { practitionerId, appointmentDate, duration, consultationType, notes } = req.body;
    
    // Simple checks
    if (!practitionerId || !appointmentDate) {
        return next(new ErrorResponse('Please specify a practitioner and appointment date.', 400));
    }
    
    // TODO: Phase 2.1 Enhancement: Add robust logic to check if the practitioner is actually available 
    // at this date/time before booking. For now, we allow booking as 'Pending'.

    // Create the appointment
    const appointment = await Appointment.create({
        patient: req.user._id, // Set from the authenticated user
        practitioner: practitionerId,
        appointmentDate: new Date(appointmentDate),
        duration: duration || 30,
        consultationType,
        notes,
        status: 'Pending',
    });

    // TODO: Phase 6: Trigger email notification to the Practitioner about the new pending booking.

    res.status(201).json({
        success: true,
        message: 'Appointment booked successfully. Awaiting practitioner confirmation.',
        data: appointment
    });
});

// @desc    Get all appointments for the current user (Patient or Practitioner)
// @route   GET /api/v1/appointments/me
// @access  Private (Both Patient and Practitioner)
exports.getMyAppointments = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    const role = req.user.role;

    let appointments;

    // Filter by role
    if (role === 'patient') {
        appointments = await Appointment.find({ patient: userId })
            .populate('practitioner', 'email'); // Populate practitioner details
    } else if (role === 'practitioner') {
        appointments = await Appointment.find({ practitioner: userId })
            .populate('patient', 'email'); // Populate patient details
    } else {
        return next(new ErrorResponse('Role not permitted to fetch appointments.', 403));
    }

    res.status(200).json({
        success: true,
        count: appointments.length,
        data: appointments
    });
});


// @desc    Update appointment status (Accept/Reject/Cancel) - Practitioner action
// @route   PUT /api/v1/appointments/:id/status
// @access  Private (Practitioner or Patient for cancellation)
exports.updateAppointmentStatus = asyncHandler(async (req, res, next) => {
    const appointmentId = req.params.id;
    const { status, cancellationReason } = req.body;

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
        return next(new ErrorResponse(`Appointment not found with id ${appointmentId}`, 404));
    }

    // Authorization Check: Only the associated Practitioner or Patient can change status/cancel
    if (req.user.role === 'practitioner' && appointment.practitioner.toString() !== req.user.id) {
        return next(new ErrorResponse('Not authorized to update this appointment.', 403));
    }
    if (req.user.role === 'patient' && status === 'Cancelled' && appointment.patient.toString() !== req.user.id) {
        return next(new ErrorResponse('Not authorized to cancel this appointment.', 403));
    }

    // Specific logic for status updates
    if (status === 'Cancelled' && cancellationReason) {
        appointment.cancellationReason = cancellationReason;
    }
    
    // Update the status
    appointment.status = status;
    await appointment.save();

    // TODO: Phase 6: Trigger email notification to the counterparty about the status change.

    res.status(200).json({
        success: true,
        data: appointment
    });
});
// src/controllers/appointment.controller.js (Modified updateAppointmentStatus)

// Import the new function
const { releaseFundsAndSplit } = require('./payment.controller'); // <-- NEW IMPORT

// ... existing code for updateAppointmentStatus

// @desc    Update appointment status (Accept/Reject/Cancel)
// @route   PUT /api/v1/appointments/:id/status
// @access  Private (Practitioner or Patient for cancellation)
exports.updateAppointmentStatus = asyncHandler(async (req, res, next) => {
    // ... existing validation and authorization checks ...

    // --- NEW LOGIC FOR PAYMENT RELEASE ---
    if (status === 'Completed' && appointment.status !== 'Completed') {
        // 1. Update Appointment Status
        appointment.status = status;
        await appointment.save();

        // 2. Trigger Fund Release (Escrow Logic)
        // We use an await here to ensure the money movement is done before responding.
        await releaseFundsAndSplit(appointment._id); 

        // TODO: Phase 6: Trigger email notification...
    } else {
        // Handle all other status changes (Confirmed, Cancelled, etc.)
        appointment.status = status;
        await appointment.save();
    }
    // --- END NEW LOGIC ---

    // ... existing response
    res.status(200).json({
        success: true,
        data: appointment
    });
});