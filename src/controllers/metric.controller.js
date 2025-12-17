// src/controllers/metric.controller.js
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

const HealthMetric = require('../models/HealthMetric');
const User = require('../models/User');

// @desc    Record a new health metric (Patient action)
// @route   POST /api/v1/metrics
// @access  Private (Patient only)
exports.recordMetric = asyncHandler(async (req, res, next) => {
    const { metricType, value, valueSecondary, unit, recordedAt, notes } = req.body;
    
    // Ensure required fields are present
    if (!metricType || value === undefined || !unit) {
        return next(new ErrorResponse('Missing required metric fields (type, value, unit).', 400));
    }
    
    // Create the metric record
    const metric = await HealthMetric.create({
        patient: req.user._id, // Tied to the authenticated patient
        metricType,
        value,
        valueSecondary,
        unit,
        recordedAt: recordedAt ? new Date(recordedAt) : Date.now(),
        notes
    });

    res.status(201).json({
        success: true,
        message: 'Health metric recorded successfully.',
        data: metric
    });
});


// @desc    Get historical metrics for the patient
// @route   GET /api/v1/metrics/:metricType
// @access  Private (Patient or Practitioner)
exports.getMetricHistory = asyncHandler(async (req, res, next) => {
    const { metricType } = req.params;
    const { limit = 100, days = 30 } = req.query; // Default to last 30 days

    let patientId;
    
    // Determine the patient ID to query
    if (req.user.role === 'patient') {
        patientId = req.user._id;
    } else if (req.user.role === 'practitioner' && req.query.patientId) {
        // Practitioners must specify the patient they are querying
        patientId = req.query.patientId;
    } else {
        return next(new ErrorResponse('Not authorized or missing patientId.', 403));
    }

    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    
    const history = await HealthMetric.find({ 
        patient: patientId,
        metricType: metricType,
        recordedAt: { $gte: startDate }
    })
    .sort('-recordedAt') // Sort by newest first
    .limit(parseInt(limit));

    res.status(200).json({
        success: true,
        count: history.length,
        data: history
    });
});