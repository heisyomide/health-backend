// src/controllers/auth.controller.js

const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const { getSignedJwtToken } = require("../utils/jwt");

// Models
const User = require("../models/User");
const PatientProfile = require("../models/PatientProfile");
const PractitionerProfile = require("../models/PractitionerProfile");


/**
 * Normalize gender enum safely
 */
const normalizeGender = (gender) => {
  if (!gender) return undefined;

  const g = gender.toString().trim().toLowerCase();

  if (g === "male") return "Male";
  if (g === "female") return "Female";
  if (g === "other") return "Other";

  return undefined;
};

/**
 * =====================================================
 * COOKIE HELPER
 * =====================================================
 */
const sendTokenResponse = (user, statusCode, res) => {
  const token = getSignedJwtToken(user);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: Number(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000,
  };

  res.status(statusCode).cookie("token", token, cookieOptions).json({
    success: true,
    token, // Sending token in body too for easier frontend handling
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      // Pass these flags to the frontend
      onboardingCompleted: user.onboardingCompleted,
      verificationStatus: user.verificationStatus,
      isVerified: user.isVerified
    },
  });
};

/**
 * =====================================================
 * REGISTER
 * =====================================================
 */
exports.register = asyncHandler(async (req, res, next) => {
  const { email, password, fullName, role } = req.body;
  if (!email || !password || !fullName) return next(new ErrorResponse("Missing fields", 400));

  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ");

  // Set default verification for Patients vs Practitioners
  const verificationStatus = (role === 'practitioner') ? 'pending' : 'approved';
  const isVerified = (role !== 'practitioner');

  const user = await User.create({
    email,
    password,
    role: role || "patient",
    verificationStatus,
    isVerified
  });

  try {
    let profile;
    if (user.role === "patient") {
      profile = await PatientProfile.create({
        user: user._id, firstName, lastName,
        age: req.body.age, gender: req.body.gender,
      });
      user.onboardingCompleted = true; // Patients are done immediately
    } else {
      profile = await PractitionerProfile.create({
        user: user._id, firstName, lastName,
        specialization: "General Practice",
      });
      // onboardingCompleted remains false for practitioners until KYC is done
    }

    user.profile = profile._id;
    await user.save({ validateBeforeSave: false });
    sendTokenResponse(user, 201, res);
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    return next(new ErrorResponse(error.message, 400));
  }
});

/**
 * =====================================================
 * LOGIN
 * =====================================================
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return next(new ErrorResponse("Invalid credentials", 401));

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }
  sendTokenResponse(user, 200, res);
});

exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
      verificationStatus: user.verificationStatus,
      isVerified: user.isVerified
    },
  });
});

/**
 * =====================================================
 * LOGOUT
 * =====================================================
 */
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie("token", "none", {
    httpOnly: true,
    expires: new Date(Date.now() + 10),
  });

  res.status(200).json({
    success: true,
    message: "Logged out",
  });
});

/**
 * =====================================================
 * GET CURRENT USER
 * =====================================================
 */
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = req.user;

  let profile = null;

  if (user.role === "patient") {
    profile = await PatientProfile.findOne({ user: user._id });
  }

  if (user.role === "practitioner") {
    profile = await PractitionerProfile.findOne({ user: user._id });
  }

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      profile,
    },
  });
});

/**
 * =====================================================
 * UPDATE PASSWORD
 * =====================================================
 */
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select("+password");

  if (!(await user.matchPassword(currentPassword))) {
    return next(
      new ErrorResponse("Current password is incorrect", 401)
    );
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});

