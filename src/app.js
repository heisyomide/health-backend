const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors'); 
const dotenv = require('dotenv');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config({ path: './.env' });

// Middleware & Utilities
const errorHandler = require('./middlewares/error.middleware'); 
const ErrorResponse = require('./utils/errorResponse'); 

// Route Files
const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const paymentRoutes = require('./routes/payment.routes');
const practitionerRoutes = require('./routes/practitioner.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const labRoutes = require('./routes/lab.routes');
const metricRoutes = require('./routes/metric.routes'); 
const adminRoutes = require('./routes/admin.routes');

const app = express();

// --- 1. GLOBAL SETTINGS & REQUEST LOGGING ---
app.use((req, res, next) => {
    // FIX: Manually redefine req.query as writable to prevent Node 22+ getter errors
    Object.defineProperty(req, 'query', {
        value: req.query,
        writable: true,
        enumerable: true,
        configurable: true
    });

    if (process.env.NODE_ENV === 'development') {
        console.log(`>>> ${req.method} ${req.url}`);
    }
    next();
});

// --- 2. SECURITY & BODY PARSING ---

// Body parser (Must be before sanitization)
app.use(express.json());
app.use(cookieParser());

// Enable CORS
app.use(cors({ 
    origin: '*', // Adjust this to your specific frontend URL in production
    credentials: true 
}));

// Set security HTTP headers
app.use(helmet());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize({ replaceWith: '_' }));

// Prevent parameter pollution
app.use(hpp());

// Rate limiting (100 requests per 10 minutes)
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 100,
  message: 'Too many requests from this IP, please try again after 10 minutes'
});
app.use('/api/', limiter);

// --- 3. ROUTES ---

// Health Check
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ success: true, message: 'API is live and stable' });
});

// Mount Routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/practitioners', practitionerRoutes);
app.use('/api/v1/labs', labRoutes);
app.use('/api/v1/metrics', metricRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/admin', adminRoutes);

// --- 4. ERROR HANDLING ---

// Catch 404
app.use((req, res, next) => {
    next(new ErrorResponse(`Route ${req.originalUrl} not found`, 404));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;