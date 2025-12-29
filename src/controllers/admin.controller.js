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
exports.getAdminStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    verifiedDoctors,
    pendingKYC,
    revenueData,
    dailyServices
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'practitioner', isVerified: true }),
    User.countDocuments({ role: 'practitioner', verificationStatus: 'pending' }),
    Transaction.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Appointment.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    })
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalUsers,
      verifiedDoctors,
      pendingKYC,
      totalRevenue: revenueData[0]?.total || 0,
      dailyServices
    }
  });
});

/* =====================================================
   USERS
===================================================== */
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select('-password')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: users
  });
});

/* =====================================================
   PRACTITIONER VERIFICATION
===================================================== */
// @route PUT /api/v1/admin/practitioners/:userId/verify
// body: { action: 'approve' | 'reject' }
exports.verifyPractitioner = asyncHandler(async (req, res, next) => {
  const { action } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return next(new ErrorResponse('Invalid verification action', 400));
  }

  const user = await User.findById(req.params.userId);
  if (!user) return next(new ErrorResponse('User not found', 404));

  if (user.role !== 'practitioner') {
    return next(new ErrorResponse('Only practitioners can be verified', 400));
  }

  const isApproved = action === 'approve';

  user.isVerified = isApproved;
  user.verificationStatus = isApproved ? 'approved' : 'rejected';
  await user.save();

  res.status(200).json({
    success: true,
    message: `Practitioner ${user.verificationStatus}`,
    data: {
      userId: user._id,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus
    }
  });
});

/* =====================================================
   PENDING PRACTITIONER REVIEWS
===================================================== */
exports.getPendingReviews = asyncHandler(async (req, res) => {
  const pending = await User.find({
    role: 'practitioner',
    verificationStatus: 'pending'
  })
    .select('firstName lastName email createdAt')
    .lean();

  res.status(200).json({
    success: true,
    data: pending
  });
});

/* =====================================================
   PAYOUTS
===================================================== */
exports.getPendingPayouts = asyncHandler(async (req, res) => {
  const payouts = await Payout.find({ status: 'requested' })
    .populate('practitioner', 'firstName lastName email');

  res.status(200).json({
    success: true,
    data: payouts
  });
});

exports.processPayout = asyncHandler(async (req, res, next) => {
  const payout = await Payout.findByIdAndUpdate(
    req.params.payoutId,
    {
      status: 'processed',
      processedAt: Date.now()
    },
    { new: true }
  );

  if (!payout) {
    return next(new ErrorResponse('Payout not found', 404));
  }

  res.status(200).json({
    success: true,
    data: payout
  });
});