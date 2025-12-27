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
   USERS
===================================================== */
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select('-password')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    users,
  });
});

/* =====================================================
   PRACTITIONER VERIFICATION (ADMIN ONLY)
===================================================== */
/* =====================================================
   PRACTITIONER VERIFICATION (ADMIN ONLY)
===================================================== */
// @desc    Verify/Approve/Reject Practitioner
// @route   PUT /api/v1/admin/practitioners/:userId/verify
exports.verifyPractitioner = asyncHandler(async (req, res, next) => {
    // We expect { action: 'approve' } or { action: 'reject' } from frontend
    const { action, verificationNotes } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) return next(new ErrorResponse('User not found', 404));

    // Safety: Only practitioners and admins need verification logic
    if (user.role === 'patient') {
        return next(new ErrorResponse('Patients do not require verification', 400));
    }

    const isApproved = action === 'approve';
    const status = isApproved ? 'approved' : 'rejected';

    // 1. Update User Auth Status
    user.isVerified = isApproved;
    user.verificationStatus = status;
    await user.save();

    // 2. Update Profile Details
    const profile = await PractitionerProfile.findOneAndUpdate(
        { user: user._id },
        {
            isVerified: isApproved,
            verificationStatus: status,
            verificationNotes: verificationNotes || '',
            verifiedBy: req.user._id,
            verifiedAt: isApproved ? Date.now() : null,
        },
        { new: true, upsert: true } // upsert handles cases where profile wasn't created yet
    );

    res.status(200).json({
        success: true,
        message: `Practitioner ${status} successfully`,
        user: {
            _id: user._id,
            isVerified: user.isVerified,
            verificationStatus: user.verificationStatus
        }
    });
});

/* =====================================================
   PENDING PRACTITIONERS
===================================================== */
exports.getPendingReviews = asyncHandler(async (req, res) => {
  const pending = await User.find({
    role: 'practitioner',
    verificationStatus: 'pending',
  })
    .select('firstName lastName email createdAt')
    .populate('practitionerProfile');

  res.status(200).json({
    success: true,
    data: pending,
  });
});

/* =====================================================
   PAYOUTS
===================================================== */
exports.getPendingPayouts = asyncHandler(async (req, res) => {
  const payouts = await Payout.find({ status: 'requested' }).populate(
    'practitioner',
    'firstName lastName email'
  );

  res.status(200).json({
    success: true,
    data: payouts,
  });
});

exports.processPayout = asyncHandler(async (req, res, next) => {
  const payout = await Payout.findByIdAndUpdate(
    req.params.payoutId,
    {
      ...req.body,
      processedAt: Date.now(),
    },
    { new: true }
  );

  if (!payout) return next(new ErrorResponse('Payout not found', 404));

  res.status(200).json({ success: true, data: payout });
});