// src/models/Prescription.js
const mongoose = require('mongoose');

const PrescriptionSchema = new mongoose.Schema({
    diagnosis: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Diagnosis',
        required: true,
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
    medications: [{
        name: {
            type: String,
            required: true
        },
        dosage: String,
        frequency: String, // e.g., "Twice daily"
        duration: String, // e.g., "7 days"
        instructions: String,
        refills: {
            type: Number,
            default: 0
        }
    }],
    datePrescribed: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Prescription', PrescriptionSchema);