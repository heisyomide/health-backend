const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Models
const User = require('../models/User');
const PractitionerProfile = require('../models/PractitionerProfile');
const Payout = require('../models/Payout');
const Transaction = require('../models/Payment');
const Appointment = require('../models/Appointment');

/* =====================================================
   ADMIN DASHBOARD STATS
===================================================== */
// @route   GET /api/v1/admin/stats
exports.getAdminStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const verifiedDoctors = await User.countDocuments({
    role: 'practitioner',
    isVerified: true,
  });

  const pendingKYC = await User.countDocuments({
    role: 'practitioner',
    verificationStatus: 'pending',
  });

  const revenueData = await Transaction.aggregate([
    { $match: { status: 'success' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const totalRevenue = revenueData[0]?.total || 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyServices = await Appointment.countDocuments({
    createdAt: { $gte: today },
  });

  res.status(200).json({
    success: true,
    stats: {
      totalUsers,
      verifiedDoctors,
      pendingKYC,
      totalRevenue,
      dailyServices,
    },
  });
});

/* =====================================================
   USERS MANAGEMENT
===================================================== */
// @route   GET /api/v1/admin/users
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select('-password')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: users.length,
    users,
  });
});

// @route   GET /api/v1/admin/practitioners
exports.getPractitioners = asyncHandler(async (req, res) => {
  const practitioners = await User.find({ role: 'practitioner' })
    .select('-password')
    .populate('practitionerProfile');

  res.status(200).json({
    success: true,
    count: practitioners.length,
    data: practitioners,
  });
});

/* =====================================================
   PRACTITIONER VERIFICATION (SINGLE SOURCE OF TRUTH)
===================================================== */
// @route   PATCH /api/v1/admin/practitioners/:userId/verify
exports.verifyPractitioner = asyncHandler(async (req, res, next) => {
  const { action, verificationNotes } = req.body; // approve | reject

  if (!['approve', 'reject'].includes(action)) {
    return next(new ErrorResponse('Invalid verification action', 400));
  }

  const user = await User.findById(req.params.userId);
  if (!user) return next(new ErrorResponse('User not found', 404));

  const isApproved = action === 'approve';
  const verificationStatus = isApproved ? 'approved' : 'rejected';

  // Update User (Auth Layer)
  user.isVerified = isApproved;
  user.verificationStatus = verificationStatus;
  await user.save();

  // Update Practitioner Profile (Data Layer)
  const profile = await PractitionerProfile.findOneAndUpdate(
    { user: user._id },
    {
      isVerified: isApproved,
      verificationStatus,
      verificationNotes,
      verifiedBy: req.user._id,
      verifiedAt: isApproved ? Date.now() : null,
    },
    { new: true }
  );

  if (!profile) {
    return next(
      new ErrorResponse('Practitioner profile not found', 404)
    );
  }

  res.status(200).json({
    success: true,
    message: `Practitioner ${verificationStatus} successfully`,
    data: {
      userId: user._id,
      email: user.email,
      status: verificationStatus,
    },
  });
});

/* =====================================================
   PENDING KYC REVIEWS
===================================================== */
// @route   GET /api/v1/admin/practitioners/pending
exports.getPendingReviews = asyncHandler(async (req, res) => {
  const pending = await User.find({
    role: 'practitioner',
    verificationStatus: 'pending',
  })
    .select('firstName lastName email createdAt')
    .populate('practitionerProfile');

  res.status(200).json({
    success: true,
    count: pending.length,
    data: pending,
  });
});

/* =====================================================
   PAYOUT MANAGEMENT
===================================================== */
// @route   GET /api/v1/admin/payouts/pending
exports.getPendingPayouts = asyncHandler(async (req, res) => {
  const payouts = await Payout.find({ status: 'requested' }).populate(
    'practitioner',
    'firstName lastName email'
  );

  res.status(200).json({
    success: true,
    count: payouts.length,
    data: payouts,
  });
});

// @route   PATCH /api/v1/admin/payouts/:payoutId
exports.processPayout = asyncHandler(async (req, res, next) => {
  const { status, externalReference, adminNotes } = req.body;

  const payout = await Payout.findByIdAndUpdate(
    req.params.payoutId,
    {
      status,
      externalReference,
      adminNotes,
      processedAt: Date.now(),
    },
    { new: true }
  );

  if (!payout) return next(new ErrorResponse('Payout not found', 404));

  res.status(200).json({
    success: true,
    data: payout,
  });
});
// @desc    Approve or Reject Practitioner (Admin only)
// @route   PATCH /api/v1/admin/users/:userId/verify
exports.verifyUser = asyncHandler(async (req, res, next) => {
  const { action } = req.body; // 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return next(new ErrorResponse('Invalid action', 400));
  }

  const user = await User.findById(req.params.userId);
  if (!user) return next(new ErrorResponse('User not found', 404));

  // Only practitioners can be verified
  if (user.role !== 'practitioner') {
    return next(new ErrorResponse('Only practitioners can be verified', 400));
  }

  const isApproved = action === 'approve';

  user.isVerified = isApproved;
  user.verificationStatus = isApproved ? 'approved' : 'rejected';
  await user.save();

  await PractitionerProfile.findOneAndUpdate(
    { user: user._id },
    {
      isVerified: isApproved,
      verificationStatus: user.verificationStatus,
      verifiedBy: req.user._id,
      verifiedAt: isApproved ? Date.now() : null,
    }
  );

  res.status(200).json({
    success: true,
    message: `Practitioner ${user.verificationStatus}`,
    data: {
      userId: user._id,
      status: user.verificationStatus,
    },
  });
});