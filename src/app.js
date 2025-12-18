const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors'); 
const dotenv = require('dotenv');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');

dotenv.config({ path: './.env' });

const errorHandler = require('./middlewares/error.middleware'); 
const ErrorResponse = require('./utils/errorResponse'); 

const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const paymentRoutes = require('./routes/payment.routes');
const practitionerRoutes = require('./routes/practitioner.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const labRoutes = require('./routes/lab.routes');
const metricRoutes = require('./routes/metric.routes'); 
const adminRoutes = require('./routes/admin.routes');

const app = express();

// --- DEBUG LOGGER ---
app.use((req, res, next) => {
    console.log(`>>> Incoming Request: ${req.method} ${req.url}`);
    next();
});

// 1. Body Parser
console.log('DEBUG: Setting up JSON Body Parser...');
app.use(express.json());
app.use(cookieParser());
console.log('DEBUG: Body Parser SUCCESS');

// 2. CORS
console.log('DEBUG: Setting up CORS...');
app.use(cors({ origin: '*', credentials: true }));
console.log('DEBUG: CORS SUCCESS');

// 3. Helmet (Security Headers)
console.log('DEBUG: Setting up Helmet...');
app.use(helmet());
console.log('DEBUG: Helmet SUCCESS');

// 4. Mongo Sanitize (NoSQL Injection)
console.log('DEBUG: Setting up MongoSanitize...');
app.use(mongoSanitize({ replaceWith: '_' }));
console.log('DEBUG: MongoSanitize SUCCESS');

// 5. HPP (Parameter Pollution)
console.log('DEBUG: Setting up HPP...');
app.use(hpp());
console.log('DEBUG: HPP SUCCESS');

// 6. Rate Limiting
console.log('DEBUG: Setting up Rate Limiter...');
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 100,
  message: 'Too many requests'
});
app.use('/api/', limiter);
console.log('DEBUG: Rate Limiter SUCCESS');

// --- ROUTES ---
console.log('DEBUG: Mounting Routes...');

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

console.log('DEBUG: Routes MOUNTED SUCCESS');

app.use((req, res, next) => {
    next(new ErrorResponse(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(errorHandler);

module.exports = app;