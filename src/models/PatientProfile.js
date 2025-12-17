const mongoose = require('mongoose');

const PatientProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // Ensure 1:1 relationship with User
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    dateOfBirth: Date,
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other']
    },
    contactNumber: String,
    address: String,
    // Future Phase 1 data will link here: medicalHistory, allergies, etc.
});

module.exports = mongoose.model('PatientProfile', PatientProfileSchema);