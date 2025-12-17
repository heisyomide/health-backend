// src/server.js
const app = require('./app');
const connectDB = require('./config/db'); // Assuming db.js exports a connection function

// Handle uncaught exceptions (Synchronous errors)
process.on('uncaughtException', err => {
    console.error(`Uncaught Exception: ${err.message}`);
    console.log('Shutting down server due to uncaught exception...');
    process.exit(1);
});

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(
    PORT,
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

// Handle unhandled promise rejections (Asynchronous errors, e.g., DB connection fails)
process.on('unhandledRejection', (err, promise) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});