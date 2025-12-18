// src/app.js
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

// Middlewares
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

// --- 1. PRIORITY MIDDLEWARE (The Order Matters!) ---

// Body parser MUST be first
app.use(express.json());
app.use(cookieParser());

// CORS - Open for all during development, or set specific origin
app.use(cors({
    origin: '*', // For now, set to '*' so your frontend can connect easily
    credentials: true
}));

// Security Headers
app.use(helmet());

// --- 2. SECURITY SANITIZATION ---

// Prevent NoSQL Injection - Added replaceWith to prevent the "getter" error
app.use(mongoSanitize({
    replaceWith: '_'
}));

// Prevent Parameter Pollution
app.use(hpp());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 100,
  message: 'Too many requests from this IP, please try again after 10 minutes'
});
app.use('/api/', limiter);

// --- 3. ROUTE MOUNTING ---

app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ success: true, message: 'API is live' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/practitioners', practitionerRoutes);
app.use('/api/v1/labs', labRoutes);
app.use('/api/v1/metrics', metricRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/admin', adminRoutes);

// --- 4. ERROR HANDLING ---

app.use((req, res, next) => {
    next(new ErrorResponse(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(errorHandler);

module.exports = app;