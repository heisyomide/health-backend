// src/controllers/appointment.controller.js
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/sendEmail');
const Payment = require('../models/Payment');
const Appointment = require('../models/Appointment');
const Availability = require('../models/Availability');
const PractitionerProfile = require('../models/PractitionerProfile');
const User = require('../models/User');
const { releaseFundsAndSplit } = require('./payment.controller'); // <-- NEW IMPORT
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

    // --- NEW: Trigger email notification to the Practitioner ---
    // We find the practitioner to get their email and name
    const practitioner = await User.findById(practitionerId);

    if (practitioner) {
        try {
            await sendEmail({
                email: practitioner.email,
                subject: 'New Appointment Request - HealthMe',
                message: `Hi ${practitioner.firstName},\n\nYou have received a new appointment request from ${req.user.firstName} ${req.user.lastName} for ${new Date(appointmentDate).toLocaleString()}.\n\nPlease log in to your dashboard to accept or reschedule the request.\n\nRegards,\nHealthMe Team`
            });
        } catch (err) {
            // We log the error but don't fail the request, as the appointment is already saved in DB
            console.error(`Practitioner notification email failed for ${practitioner.email}:`, err.message);
        }
    }

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

// @desc    Update appointment status (Accept/Reject/Cancel)
// @route   PUT /api/v1/appointments/:id/status
// @access  Private (Practitioner or Patient for cancellation)
exports.updateAppointmentStatus = asyncHandler(async (req, res, next) => {
    const appointmentId = req.params.id;
    const { status, cancellationReason } = req.body;

    // 1. Find appointment and populate patient/practitioner to get emails easily
    const appointment = await Appointment.findById(appointmentId)
        .populate('patient', 'firstName lastName email')
        .populate('practitioner', 'firstName lastName email');

    if (!appointment) {
        return next(new ErrorResponse(`Appointment not found with id ${appointmentId}`, 404));
    }

    // 2. Authorization Check
    if (req.user.role === 'practitioner' && appointment.practitioner._id.toString() !== req.user.id) {
        return next(new ErrorResponse('Not authorized to update this appointment.', 403));
    }
    if (req.user.role === 'patient' && status === 'Cancelled' && appointment.patient._id.toString() !== req.user.id) {
        return next(new ErrorResponse('Not authorized to cancel this appointment.', 403));
    }

    // 3. Logic for status updates
    if (status === 'Cancelled' && cancellationReason) {
        appointment.cancellationReason = cancellationReason;
    }
    
    // Update the status
    appointment.status = status;
    await appointment.save();

    // --- NEW: Trigger Email Notifications ---

    // Scenario A: Practitioner Accepts (Status: Confirmed) -> Email Patient
    if (status === 'Confirmed') {
        try {
            await sendEmail({
                email: appointment.patient.email,
                subject: 'Appointment Confirmed! - HealthMe',
                message: `Hi ${appointment.patient.firstName},\n\nYour appointment with Dr. ${appointment.practitioner.lastName} has been officially confirmed for ${new Date(appointment.appointmentDate).toLocaleString()}.\n\nPlease ensure you complete your payment before the session starts.\n\nRegards,\nHealthMe Team`
            });
        } catch (err) {
            console.error('Patient confirmation email failed:', err.message);
        }
    }

    // Scenario B: Someone Cancels (Status: Cancelled) -> Email the "other" person
    if (status === 'Cancelled') {
        // If patient cancels, notify practitioner. If practitioner cancels, notify patient.
        const recipient = req.user.role === 'patient' ? appointment.practitioner : appointment.patient;
        try {
            await sendEmail({
                email: recipient.email,
                subject: 'Appointment Cancelled - HealthMe',
                message: `Hi ${recipient.firstName},\n\nWe are writing to inform you that the appointment scheduled for ${new Date(appointment.appointmentDate).toLocaleString()} has been cancelled.\n\nReason: ${cancellationReason || 'No reason provided.'}\n\nRegards,\nHealthMe Team`
            });
        } catch (err) {
            console.error('Cancellation email failed:', err.message);
        }
    }

    res.status(200).json({
        success: true,
        data: appointment
    });
});
// src/controllers/appointment.controller.js (Modified updateAppointmentStatus)

// Import the new function


// ... existing code for updateAppointmentStatus

// Ensure these are imported at the top of your appointment.controller.js


// @desc    Update appointment status (Accept/Reject/Cancel)
// @route   PUT /api/v1/appointments/:id/status
// @access  Private (Practitioner or Patient for cancellation)
exports.updateAppointmentStatus = asyncHandler(async (req, res, next) => {
    // ... existing validation and authorization checks (finding the appointment) ...

    // --- NEW LOGIC FOR PAYMENT RELEASE & NOTIFICATION ---
    if (status === 'Completed' && appointment.status !== 'Completed') {
        // 1. Update Appointment Status
        appointment.status = status;
        await appointment.save();

        // 2. Trigger Fund Release (Escrow Logic)
        await releaseFundsAndSplit(appointment._id); 

        // 3. Fetch Payment details & Practitioner Email for the notification
        // We populate 'practitioner' to get the email field from the User model
        const paymentData = await Payment.findOne({ appointment: appointment._id })
            .populate('practitioner', 'firstName email');

        if (paymentData && paymentData.practitioner) {
            try {
                await sendEmail({
                    email: paymentData.practitioner.email,
                    subject: 'Funds Released to Wallet - HealthMe',
                    message: `Hi ${paymentData.practitioner.firstName}, the service for Appointment #${appointment._id} is marked as complete. ₦${paymentData.practitionerShare.toLocaleString()} has been moved to your available balance in your HealthMe wallet.`
                });
            } catch (err) {
                console.error(`Email failed to send to practitioner: ${err.message}`);
            }
        }
    } else {
        // Handle all other status changes (Confirmed, Cancelled, etc.)
        appointment.status = status;
        await appointment.save();
    }
    // --- END NEW LOGIC ---

    res.status(200).json({
        success: true,
        data: appointment
    });
});