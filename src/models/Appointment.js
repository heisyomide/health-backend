const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  practitioner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  appointmentDate: { type: Date, required: true },
  duration: { type: Number, default: 30 },

  status: {
    type: String,
    enum: [
      'BOOKED',
      'PAID',
      'PRACTITIONER_CONFIRMED',
      'COMPLETED',
      'CANCELLED'
    ],
    default: 'BOOKED'
  },

  practitionerConfirmedAt: Date,
  patientConfirmedAt: Date,

  completionEvidence: {
    practitionerNote: String,
    image: String
  },

  consultationType: {
    type: String,
    enum: ['Video', 'In-person', 'Phone'],
    required: true
  },

}, { timestamps: true });