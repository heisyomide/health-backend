const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const User = require("../models/User");

/* =====================================================
   PROTECT ROUTES
===================================================== */
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new ErrorResponse("Not authorized. No token provided.", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new ErrorResponse("User no longer exists.", 401));
    }

    req.user = user;
    next();
  } catch (err) {
    return next(new ErrorResponse("Not authorized. Token invalid.", 401));
  }
});

/* =====================================================
   ROLE AUTHORIZATION
===================================================== */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Role (${req.user.role}) not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

/* =====================================================
   ADMIN ONLY
===================================================== */
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }

  return next(new ErrorResponse("Admin access only", 403));
};