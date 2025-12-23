const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Models
const User = require('../models/User');
const PractitionerProfile = require('../models/PractitionerProfile');
const Payout = require('../models/Payout');
const Transaction = require('../models/Payment'); 
const Appointment = require('../models/Appointment');

// @desc    Get dashboard metrics
// @route   GET /api/v1/admin/stats
exports.getAdminStats = asyncHandler(async (req, res, next) => {
    const totalUsers = await User.countDocuments();
    const verifiedDoctors = await User.countDocuments({ role: 'practitioner', isVerified: true });
    const pendingKYC = await User.countDocuments({ role: 'practitioner', kycStatus: 'pending' });

    let totalRevenue = 0;
    if (Transaction) {
        const revenueData = await Transaction.aggregate([
            { $match: { status: 'success' } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        totalRevenue = revenueData[0]?.total || 0;
    }

    let dailyServices = 0;
    if (Appointment) {
        const today = new Date().setHours(0, 0, 0, 0);
        dailyServices = await Appointment.countDocuments({ createdAt: { $gte: today } });
    }

    res.status(200).json({
        success: true,
        stats: { totalUsers, verifiedDoctors, pendingKYC, totalRevenue, dailyServices }
    });
});

// @desc    Get all users for the unified admin dashboard
// @route   GET /api/v1/admin/users
exports.getAllUsers = asyncHandler(async (req, res, next) => {
    const users = await User.find({})
        .select("-password")
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: users.length,
        users // Frontend expects 'users'
    });
});

// @desc    Get all practitioners
exports.getPractitioners = asyncHandler(async (req, res, next) => {
    const practitioners = await User.find({ role: 'practitioner' }).populate('practitionerProfile');
    res.status(200).json({ success: true, count: practitioners.length, data: practitioners });
});

// @desc    Verify/Approve Practitioner
exports.verifyPractitioner = asyncHandler(async (req, res, next) => {
    const { isVerified, verificationNotes } = req.body;
    const profile = await PractitionerProfile.findOneAndUpdate(
        { user: req.params.userId },
        { isVerified, verificationNotes, verifiedBy: req.user._id, verifiedAt: Date.now() },
        { new: true }
    );
    if (!profile) return next(new ErrorResponse('Profile not found', 404));
    res.status(200).json({ success: true, data: profile });
});

// @desc    Get pending payout requests
exports.getPendingPayouts = asyncHandler(async (req, res, next) => {
    const payouts = await Payout.find({ status: 'requested' }).populate('practitioner', 'firstName lastName email');
    res.status(200).json({ success: true, count: payouts.length, data: payouts });
});

// @desc    Process Payout
exports.processPayout = asyncHandler(async (req, res, next) => {
    const { status, externalReference, adminNotes } = req.body;
    const payout = await Payout.findByIdAndUpdate(
        req.params.payoutId,
        { status, externalReference, adminNotes, processedAt: Date.now() },
        { new: true }
    );
    if (!payout) return next(new ErrorResponse('Payout not found', 404));
    res.status(200).json({ success: true, data: payout });
});