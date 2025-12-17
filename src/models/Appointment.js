// src/models/Appointment.js
const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    practitioner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    appointmentDate: {
        type: Date,
        required: true,
    },
    duration: {
        type: Number, // Duration in minutes (e.g., 30, 60)
        default: 30,
    },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed', 'Rescheduled'],
        default: 'Pending',
    },
    consultationType: {
        type: String,
        enum: ['Video', 'In-person', 'Phone'],
        required: true,
    },
    notes: String, // Patient's reason for visit
    cancellationReason: String,
}, { timestamps: true });

// Optional: Add index for faster querying by practitioner/date
AppointmentSchema.index({ practitioner: 1, appointmentDate: 1 });

module.exports = mongoose.model('Appointment', AppointmentSchema);