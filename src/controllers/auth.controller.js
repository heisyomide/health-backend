// src/controllers/auth.controller.js

const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const { getSignedJwtToken } = require("../utils/jwt");

const User = require("../models/User");
const PatientProfile = require("../models/PatientProfile");
const PractitionerProfile = require("../models/PractitionerProfile");

const sendTokenResponse = async (user, statusCode, res) => {
  let profile = null;

  if (user.role === "patient") {
    profile = await PatientProfile.findOne({ user: user._id });
  }

  if (user.role === "practitioner") {
    profile = await PractitionerProfile.findOne({ user: user._id });
  }

  const token = getSignedJwtToken(user);

  res
    .status(statusCode)
    .cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: Number(process.env.JWT_COOKIE_EXPIRE) * 86400000,
    })
    .json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile,
      },
    });
};

/* REGISTER */
exports.register = asyncHandler(async (req, res) => {
  const { email, password, role, firstName, lastName, specialization } = req.body;

  const user = await User.create({ email, password, role });

  if (role === "patient") {
    await PatientProfile.create({ user: user._id, firstName, lastName });
  }

  if (role === "practitioner") {
    await PractitionerProfile.create({
      user: user._id,
      firstName,
      lastName,
      specialization: specialization || "General Practice",
    });
  }

  await sendTokenResponse(user, 201, res);
});

/* LOGIN */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  await sendTokenResponse(user, 200, res);
});

/* GET ME */
exports.getMe = asyncHandler(async (req, res) => {
  await sendTokenResponse(req.user, 200, res);
});

/* LOGOUT */
exports.logout = asyncHandler(async (req, res) => {
  res.cookie("token", "none", { expires: new Date(Date.now() + 10) });
  res.status(200).json({ success: true });
});