const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const User = require("../models/User");

/* =====================================================
   PROTECT ROUTES (JWT / COOKIE SAFE)
===================================================== */
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1️⃣ Prefer Authorization header (API / mobile)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // 2️⃣ Fallback to HttpOnly cookie (browser)
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token || token === "none") {
    return next(new ErrorResponse("Not authorized", 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new ErrorResponse("Session expired. Please login again.", 401));
  }

  const user = await User.findById(decoded.id).select(
    "email role onboardingCompleted verificationStatus isVerified"
  );

  if (!user) {
    return next(new ErrorResponse("User no longer exists", 401));
  }

  // Attach user to request
  req.user = user;
  next();
});

/* =====================================================
   ROLE AUTHORIZATION (GENERIC)
===================================================== */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Role (${req.user?.role}) not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

/* =====================================================
   ADMIN ONLY (SHORTCUT)
===================================================== */
exports.admin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new ErrorResponse("Admin access only", 403));
  }
  next();
};