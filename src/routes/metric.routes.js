// src/routes/metric.routes.js
const express = require('express');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { 
    recordMetric,
    getMetricHistory
} = require('../controllers/metric.controller');

const router = express.Router();

// Apply protection to all metric routes
router.use(protect);

// POST /metrics (Record a new metric - patient only)
router.route('/')
    .post(authorize('patient'), recordMetric);

// GET /metrics/:metricType (Fetch history - patient or practitioner)
router.route('/:metricType')
    .get(authorize('patient', 'practitioner'), getMetricHistory);

module.exports = router;