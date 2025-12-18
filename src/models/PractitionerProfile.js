const mongoose = require('mongoose');

const PractitionerProfileSchema = new mongoose.Schema({
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
    specialization: { // Phase 1.2
        type: String,
        required: true,
         enum: ['General Practice', 'Pediatrics', 'Cardiology', 'Mental Health', 'Other']

    },
    licenseNumber: { // Phase 4.2 (KYC)
        type: String,
        unique: true
    },
    isVerified: { // Status of KYC/Admin Approval
        type: Boolean,
        default: false
    },
    contactNumber: String,
    clinicAddress: String,
    // Future Phase 1.2 data will be added here: availability, assignedPatients, etc.
});

module.exports = mongoose.model('PractitionerProfile', PractitionerProfileSchema);