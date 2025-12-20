// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse'); // Assuming you have a custom ErrorResponse utility
const User = require('../models/User');

/**
 * Middleware to protect routes: Verify JWT and attach user to request
 */
exports.protect = asyncHandler(async (req, res, next) => {
    let token;

    // 1. Check for token in headers (Bearer Token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } 
    // 2. Check for token in cookies (Optional but good practice for frontend apps)
    else if (req.cookies.token) {
        token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
        return next(new ErrorResponse('Not authorized to access this route. No token found.', 401));
    }

    try {
        // Verify token and decode payload
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from DB based on ID in token
        const user = await User.findById(decoded.id).select('+password'); 
        
        if (!user) {
            return next(new ErrorResponse('User not found. Invalid token.', 401));
        }

        // Attach user object to the request (crucial for authorization)
        req.user = user;
        next();

    } catch (err) {
        // If token is invalid or expired
        return next(new ErrorResponse('Not authorized to access this route. Token failed.', 401));
    }
});

/**
 * Middleware for Role-Based Access Control (RBAC)
 * Authorize users based on their role
 * @param  {...string} roles - An array of allowed roles, e.g., ['patient', 'admin']
 */
exports.authorize = (...roles) => {
    return (req, res, next) => {
        // Check if the user's role (attached by the 'protect' middleware) is in the list of allowed roles
        if (!roles.includes(req.user.role)) {
            return next(
                new ErrorResponse(
                    `User role ${req.user.role} is not authorized to access this route.`,
                    403 // Forbidden
                )
            );
        }
        next();
    };
};

// src/middlewares/auth.middleware.js (Conceptual check)
exports.authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return next(new ErrorResponse(`User role ${req.user.role} is not authorized to access this route`, 403));
    }
    next();
};
// Add or verify this export:
exports.admin = (req, res, next) => {
    // Check if user exists (from protect) and has admin role
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ 
            success: false, 
            message: "Not authorized as an admin" 
        });
    }
};
// This allows us to use: authorize('admin')