const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const { getSignedJwtToken } = require("../utils/jwt");

// Models
const User = require("../models/User");
const PatientProfile = require("../models/PatientProfile");
const PractitionerProfile = require("../models/PractitionerProfile");

/* =====================================================
   TOKEN RESPONSE (SINGLE SOURCE)
===================================================== */
const sendTokenResponse = (user, statusCode, res) => {
  const token = getSignedJwtToken(user);

  res
    .status(statusCode)
    .cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge:
        Number(process.env.JWT_COOKIE_EXPIRE || 7) *
        24 *
        60 *
        60 *
        1000,
    })
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
        verificationStatus: user.verificationStatus,
        isVerified: user.isVerified,
      },
    });
};

/* =====================================================
   REGISTER
===================================================== */
exports.register = asyncHandler(async (req, res, next) => {
  const {
    email,
    password,
    fullName,
    role = "patient",
    age,
    gender,
  } = req.body;

  if (!email || !password || !fullName) {
    return next(new ErrorResponse("Missing required fields", 400));
  }

  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  const lastName = rest.join(" ");

  const isPractitioner = role === "practitioner";

  const user = await User.create({
    email: email.toLowerCase(),
    password,
    role,
    onboardingCompleted: !isPractitioner,
    verificationStatus: isPractitioner ? "pending" : "approved",
    isVerified: !isPractitioner,
  });

  try {
    if (role === "patient") {
      await PatientProfile.create({
        user: user._id,
        firstName,
        lastName,
        age,
        gender,
      });
    }

    if (role === "practitioner") {
      await PractitionerProfile.create({
        user: user._id,
        firstName,
        lastName,
        specialization: null,
        licenseNumber: null,
      });
    }

    sendTokenResponse(user, 201, res);
  } catch (err) {
    await User.findByIdAndDelete(user._id);
    return next(new ErrorResponse(err.message, 400));
  }
});

/* =====================================================
   LOGIN (RATE-SAFE)
===================================================== */
exports.login = asyncHandler(async (req, res, next) => {
  const email = req.body.email?.toLowerCase();
  const password = req.body.password;

  if (!email || !password) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  sendTokenResponse(user, 200, res);
});

/* =====================================================
   GET CURRENT USER
===================================================== */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

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
      onboardingCompleted: user.onboardingCompleted,
      verificationStatus: user.verificationStatus,
      isVerified: user.isVerified,
      profile,
    },
  });
});

/* =====================================================
   LOGOUT
===================================================== */
exports.logout = asyncHandler(async (req, res) => {
  res.cookie("token", "none", {
    httpOnly: true,
    expires: new Date(Date.now() + 10),
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});