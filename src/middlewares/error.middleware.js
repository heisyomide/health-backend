// src/middlewares/error.middleware.js
const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
    // 1. Create a simplified error object instead of spreading the whole 'err'
    let error = {
        statusCode: err.statusCode,
        message: err.message
    };

    // Log to console for dev (using standard console.log if 'colors' isn't installed)
    console.error(`Error Stack: ${err.stack}`); 

    // Mongoose Bad ObjectId (CastError)
    if (err.name === 'CastError') {
        const message = `Resource not found with id of ${err.value}`;
        error = new ErrorResponse(message, 404);
    }
    
    // Mongoose Duplicate Key (E11000)
if (err.code === 11000) {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];

  error = new ErrorResponse(
    `${field.charAt(0).toUpperCase() + field.slice(1)} already exists: ${value}`,
    400
  );
}
    // Mongoose Validation Error (ValidationError)
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message);
        error = new ErrorResponse(message.join(', '), 400);
    }

    // 2. IMPORTANT: Use the original 'err' if 'error' wasn't reassigned to a new ErrorResponse
    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error'
    });
};

module.exports = errorHandler;