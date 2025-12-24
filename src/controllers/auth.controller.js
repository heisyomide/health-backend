// src/controllers/auth.controller.js

const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const { getSignedJwtToken } = require("../utils/jwt");

// Models
const User = require("../models/User");
const PatientProfile = require("../models/PatientProfile");
const PractitionerProfile = require("../models/PractitionerProfile");

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
    maxAge:
      Number(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000,
  };

  res
    .status(statusCode)
    .cookie("token", token, cookieOptions)
    .json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
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

  // 1. Validation check before DB operations
  if (!email || !password || !fullName) {
    return next(new ErrorResponse("Please provide email, password, and full name", 400));
  }

  // 2. Prepare Profile Data
  const nameParts = fullName.trim().split(/\s+/); // Splits by any whitespace
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

  // 3. Create User
  const user = await User.create({
    email,
    password,
    role: role || "patient",
  });

  try {
    let profile;

    // 4. Create Role-Specific Profile
    if (user.role === "patient") {
      profile = await PatientProfile.create({
        user: user._id,
        firstName,
        lastName,
        ...req.body // Spread remaining optional fields (age, gender, etc.)
      });
    } else if (user.role === "practitioner") {
      profile = await PractitionerProfile.create({
        user: user._id,
        firstName,
        lastName,
        specialization: req.body.specialization || "General",
      });
    }

    if (!profile) throw new Error("Profile definition missing for this role");

    // 5. Finalize User association
    user.profile = profile._id;
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 201, res);

  } catch (error) {
    // 6. CLEANUP: If profile fails, delete the "Ghost User"
    await User.findByIdAndDelete(user._id);
    return next(new ErrorResponse(`Registration failed at profile stage: ${error.message}`, 500));
  }
});

/**
 * =====================================================
 * LOGIN
 * =====================================================
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  sendTokenResponse(user, 200, res);
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