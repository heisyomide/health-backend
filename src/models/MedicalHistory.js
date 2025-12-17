// src/models/MedicalHistory.js
const mongoose = require('mongoose');

const MedicalHistorySchema = new mongoose.Schema({
    // Link back to the User who owns this record
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // A patient should only have one core medical history record
    },
    // --- Phase 1.1 Core Modules ---
    
    // Allergies (Array of embedded objects or strings)
    allergies: [{
        name: {
            type: String,
            required: [true, 'Allergy name is required']
        },
        severity: {
            type: String,
            enum: ['Mild', 'Moderate', 'Severe', 'Life-Threatening'],
            default: 'Mild'
        },
        reaction: String
    }],

    // Conditions (Chronic or past illnesses)
    conditions: [{
        name: {
            type: String,
            required: [true, 'Condition name is required']
        },
        diagnosisDate: Date,
        status: {
            type: String,
            enum: ['Active', 'Resolved', 'In Remission'],
            default: 'Active'
        },
        notes: String
    }],

    // Medications (Current or recent prescriptions)
    medications: [{
        name: {
            type: String,
            required: [true, 'Medication name is required']
        },
        dosage: String,
        frequency: String,
        startDate: Date,
        endDate: Date
    }],
    
    // Vitals (Latest recorded set, though typically Vitals would be tracked in a separate, time-stamped collection)
    // For simplicity in Phase 1, we store the *last updated* vitals here:
    lastUpdatedVitals: {
        bloodType: String,
        heightCm: Number,
        weightKg: Number,
        // Optional fields for tracking
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    }
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

module.exports = mongoose.model('MedicalHistory', MedicalHistorySchema);