// src/app.js
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors'); // Essential for frontend/backend communication
const dotenv = require('dotenv');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');

// Load environment variables (Make sure this is done before importing files that rely on it)
dotenv.config({ path: './.env' });

// Middlewares
const { protect } = require('./middlewares/auth.middleware'); 
const errorHandler = require('./middlewares/error.middleware'); 
const ErrorResponse = require('./utils/errorResponse'); 

// Route Files
const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const paymentRoutes = require('./routes/payment.routes');
const practitionerRoutes = require('./routes/practitioner.routes');
const appointmentRoutes = require('./routes/appointment.routes'); // <-- NEW
const labRoutes = require('./routes/lab.routes'); // <-- NEW
const metricRoutes = require('./routes/metric.routes'); 
const adminRoutes = require('./routes/admin.routes'); // <-- NEW// <-- NEW
// const practitionerRoutes = require('./routes/practitioner.routes'); // Phase 1.2

const app = express();

// --- General Middleware Setup ---

// Body parser: Allows us to read JSON data from the request body
app.use(express.json());

// Import security packages




// 2. Prevent NoSQL Injection (sanitizes $ and . from inputs)
app.use(mongoSanitize());

// 3. Prevent XSS (sanitizes HTML/Scripts in inputs)
app.use(xss());

// 4. Prevent Parameter Pollution
app.use(hpp());

// 5. Rate Limiting (100 requests per 10 minutes)
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 100,
  message: 'Too many requests from this IP, please try again after 10 minutes'
});
app.use('/api/', limiter); // Apply to all API routes

// ... rest of your app.use routes

// Cookie parser: Allows us to read cookies for JWT handling
app.use(cookieParser());

// Security Headers (Helmet)
app.use(helmet());

// CORS - Setup for frontend communication
// In a production environment, replace '*' with your frontend URL
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'YOUR_FRONTEND_URL' : '*',
    credentials: true
}));

// --- Route Mounting ---

// V1 API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/appointments', appointmentRoutes); // <-- MOUNTED
app.use('/api/v1/practitioners', practitionerRoutes);
app.use('/api/v1/labs', labRoutes); // <-- MOUNTED
app.use('/api/v1/metrics', metricRoutes); // <-- MOUNTED
app.use('/api/v1/payments', paymentRoutes); // <-- MOUNTED
app.use('/api/v1/admin', adminRoutes); // <-- MOUNTED
// app.use('/api/v1/practitioners', practitionerRoutes); // Mount when created

// --- Error Handling and Catch-All ---

// Catch-all for undefined routes (404 Not Found)
// Catch-all for undefined routes (404 Not Found)
// Use 'app.use' without a path as the final handler for unmatched routes.
app.use((req, res, next) => {
    next(new ErrorResponse(`Can't find ${req.originalUrl} on this server!`, 404));
});
// Custom Error Handler middleware (Must be last middleware)
app.use(errorHandler);

module.exports = app;