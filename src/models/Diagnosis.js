// src/models/Diagnosis.js
const mongoose = require('mongoose');

const DiagnosisSchema = new mongoose.Schema({
    // Link to the specific appointment that led to this diagnosis
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true,
        unique: true // One diagnosis per appointment
    },
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
    chiefComplaint: String, // From appointment notes or refined
    subjective: String, // Patient's report (S of SOAP note)
    objective: String, // Practitioner's findings (O of SOAP note)
    assessment: { // Practitioner's official diagnosis
        type: String, 
        required: true
    },
    plan: String, // Treatment plan overview
}, { timestamps: true });

module.exports = mongoose.model('Diagnosis', DiagnosisSchema);