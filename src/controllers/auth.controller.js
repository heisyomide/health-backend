// src/controllers/auth.controller.js
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { getSignedJwtToken } = require('../utils/jwt');

// Mongoose Models
const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const PractitionerProfile = require('../models/PractitionerProfile');

// Helper function to handle response standardization
const sendTokenResponse = (user, statusCode, res) => {
    const token = getSignedJwtToken(user);

    // Options for the cookie
    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000), // Convert to milliseconds
        httpOnly: true,
        // Recommended for production
        secure: process.env.NODE_ENV === 'production'
    };

    res.status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            token,
            role: user.role
        });
};


// @desc    Register a new user (Patient or Practitioner)
// @route   POST /api/v1/auth/signup
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
    const { email, password, firstName, lastName, role } = req.body;

    // 1. Create the User (Handles password hashing via pre-save hook)
    const user = await User.create({
        email,
        password,
        role: role || 'patient' // Default to patient if role is not specified
    });

    // 2. Create the corresponding Profile
    let profile;
    const profileData = { 
        user: user._id, 
        firstName, 
        lastName 
        // Additional required fields for Phase 0/1 can be added here
    };

    if (user.role === 'patient') {
        profile = await PatientProfile.create(profileData);
    } else if (user.role === 'practitioner') {
        // Practitioners will need specialization and license number, 
        // but we'll create the basic shell now.
        profile = await PractitionerProfile.create({
            ...profileData,
            specialization: req.body.specialization || 'General',
        });
    }

    // 3. Link the profile to the user (if necessary, for easy population)
    user.profile = profile._id;
    // NOTE: The 'ref' property for 'profile' on the User model is intentionally left 
    // flexible or is handled via population logic in getMe, so we only save the ID here.
    await user.save({ validateBeforeSave: false }); 

    // 4. Send the JWT response
    sendTokenResponse(user, 201, res);
});


// @desc    Log user in
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // 1. Basic validation
    if (!email || !password) {
        return next(new ErrorResponse('Please provide an email and password', 400));
    }

    // 2. Check for user (must explicitly select password)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // 3. Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // 4. Send the JWT response
    sendTokenResponse(user, 200, res);
});


// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private (but simple, clears client state)
exports.logout = asyncHandler(async (req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000), // Expire quickly
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        data: {}
    });
});


// @desc    Get current logged in user and profile data
// @route   GET /api/v1/auth/me
// @access  Private (Requires 'protect' middleware)
exports.getMe = asyncHandler(async (req, res, next) => {
    // req.user is populated by the 'protect' middleware
    const user = req.user; 

    let profileData = null;
    
    // Dynamically populate the specific profile based on the user's role
    if (user.role === 'patient') {
        profileData = await PatientProfile.findOne({ user: user._id });
    } else if (user.role === 'practitioner') {
        profileData = await PractitionerProfile.findOne({ user: user._id });
    }

    res.status(200).json({
        success: true,
        user: {
            id: user._id,
            email: user.email,
            role: user.role,
            profile: profileData
        }
    });
});

// src/controllers/auth.controller.js (Append this to the file)

// ... existing functions (register, login, logout, getMe) ...

// @desc    Update user password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
    // 1. Get the current user from req.user (attached by 'protect' middleware)
    const user = await User.findById(req.user.id).select('+password');

    const { currentPassword, newPassword } = req.body;

    // 2. Validate current password
    if (!(await user.matchPassword(currentPassword))) {
        return next(new ErrorResponse('Current password is incorrect.', 401));
    }

    // 3. Update the password field
    user.password = newPassword;
    
    // The pre('save') middleware on the User model will automatically hash the new password.
    await user.save(); 

    // 4. Respond
    // Log them out by sending a new token response, or simply clearing the cookie
    res.status(200).json({
        success: true,
        message: 'Password successfully updated.'
    });
});