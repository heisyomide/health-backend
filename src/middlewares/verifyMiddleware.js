exports.isVerifiedPractitioner = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: "Access Denied. Your account is currently under verification review."
    });
  }
  next();
};