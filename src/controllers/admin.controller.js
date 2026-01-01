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
      { $match: { status: 'released' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$platformFee' }
        }
      }
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
   PENDING PRACTITIONER REVIEWS (ADMIN KYC QUEUE)
===================================================== */
exports.getPendingReviews = asyncHandler(async (req, res) => {
  const pending = await PractitionerProfile.find({
    verificationStatus: 'pending'
  })
    .populate('user', 'firstName lastName email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: pending
  });
});

/* =====================================================
   PRACTITIONER VERIFICATION
===================================================== */
// PUT /api/v1/admin/practitioners/:userId/verify
// body: { action: 'approve' | 'reject' }
exports.verifyPractitioner = asyncHandler(async (req, res, next) => {
  const { action } = req.body;
  const { userId } = req.params;

  if (!['approve', 'reject'].includes(action)) {
    return next(new ErrorResponse('Invalid verification action', 400));
  }

  const user = await User.findById(userId);
  if (!user || user.role !== 'practitioner') {
    return next(new ErrorResponse('Practitioner not found', 404));
  }

  const profile = await PractitionerProfile.findOne({ user: userId });
  if (!profile) {
    return next(new ErrorResponse('Practitioner profile not found', 404));
  }

  const isApproved = action === 'approve';

  // Update USER
  user.isVerified = isApproved;
  user.verificationStatus = isApproved ? 'approved' : 'rejected';
  await user.save();

  // Update PRACTITIONER PROFILE
  profile.verificationStatus = isApproved ? 'approved' : 'rejected';
  profile.verifiedAt = isApproved ? Date.now() : null;
  await profile.save();

  res.status(200).json({
    success: true,
    message: `Practitioner ${profile.verificationStatus}`
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