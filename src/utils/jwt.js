// src/utils/jwt.js
const jwt = require('jsonwebtoken');

// Get token from model and create cookie
const getSignedJwtToken = (user) => {
    // Sign the token with user ID and role
    return jwt.sign(
        { id: user._id, role: user.role }, 
        process.env.JWT_SECRET, // Should be defined in .env
        { expiresIn: process.env.JWT_EXPIRES_IN } // Should be defined in .env
    );
};

module.exports = { getSignedJwtToken };