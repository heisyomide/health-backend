// src/models/Availability.js
const mongoose = require('mongoose');

const AvailabilitySchema = new mongoose.Schema({
    practitioner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // Ensure 1:1 availability record per practitioner
    },
    // Array to hold recurring weekly schedule slots
    schedule: [{
        dayOfWeek: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            required: true
        },
        startTime: { // E.g., "09:00"
            type: String,
            required: true
        },
        endTime: { // E.g., "17:00"
            type: String,
            required: true
        }
    }],
    // Optional: for vacation/out-of-office blocks (Phase 2 refinement)
    unavailableDates: [Date]
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

module.exports = mongoose.model('Availability', AvailabilitySchema);