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