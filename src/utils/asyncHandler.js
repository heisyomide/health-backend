// src/utils/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) => {
    // Promises.resolve() ensures that the function returns a promise
    // .catch(next) catches any errors and passes them to the Express error handler
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;