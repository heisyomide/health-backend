// src/models/HealthMetric.js
const mongoose = require('mongoose');

const HealthMetricSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    metricType: {
        type: String,
        enum: ['Weight', 'Blood Pressure', 'Glucose', 'Temperature', 'Heart Rate'],
        required: true,
    },
    value: {
        // For simple metrics like Weight or Heart Rate
        type: Number,
        required: true,
    },
    valueSecondary: {
        // Used for metrics like Blood Pressure (Diastolic)
        type: Number,
    },
    unit: {
        type: String, // e.g., 'kg', 'mmHg', 'mmol/L'
        required: true,
    },
    recordedAt: {
        type: Date,
        default: Date.now,
    },
    notes: String,
}, { timestamps: true });

// Index for efficient querying of a patient's history for a specific metric type
HealthMetricSchema.index({ patient: 1, metricType: 1, recordedAt: -1 });

module.exports = mongoose.model('HealthMetric', HealthMetricSchema);