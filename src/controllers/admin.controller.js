const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Models
const User = require('../models/User');
const PractitionerProfile = require('../models/PractitionerProfile');
const Payout = require('../models/Payout');
// Ensure these exist or provide fallbacks to prevent crash
const Transaction = require('../models/Payment'); 
const Appointment = require('../models/Appointment');

// --- Dashboard Statistics ---

// @desc    Get dashboard metrics
// @route   GET /api/v1/admin/stats
// @access  Private (Admin only)
exports.getAdminStats = asyncHandler(async (req, res, next) => {
    // 1. Count Users by Role
    const totalUsers = await User.countDocuments();
    const verifiedDoctors = await User.countDocuments({ role: 'practitioner', isVerified: true });
    
    // Adjusting this to match your User model field if kycStatus exists there
    const pendingKYC = await User.countDocuments({ role: 'practitioner', kycStatus: 'pending' });

    // 2. Aggregate Revenue
    let totalRevenue = 0;
    if (Transaction) {
        const revenueData = await Transaction.aggregate([
            { $match: { status: 'success' } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        totalRevenue = revenueData[0]?.total || 0;
    }

    // 3. Daily Activity (Appointments today)
    let dailyServices = 0;
    if (Appointment) {
        const today = new Date().setHours(0, 0, 0, 0);
        dailyServices = await Appointment.countDocuments({ createdAt: { $gte: today } });
    }

    res.status(200).json({
        success: true,
        stats: {
            totalUsers,
            verifiedDoctors,
            pendingKYC,
            totalRevenue,
            dailyServices
        }
    });
});

// --- Practitioner Management ---

exports.getPractitioners = asyncHandler(async (req, res, next) => {
    const practitioners = await User.find({ role: 'practitioner' }).populate('practitionerProfile');
    res.status(200).json({
        success: true,
        count: practitioners.length,
        data: practitioners
    });
});

exports.verifyPractitioner = asyncHandler(async (req, res, next) => {
    const { isVerified, verificationNotes } = req.body;

    if (isVerified === undefined) {
        return next(new ErrorResponse('Please specify verification status (true/false).', 400));
    }

    const profile = await PractitionerProfile.findOneAndUpdate(
        { user: req.params.userId },
        { 
            isVerified,
            verificationNotes,
            verifiedBy: req.user._id,
            verifiedAt: Date.now()
        },
        { new: true }
    );

    if (!profile) {
        return next(new ErrorResponse(`Profile not found for user ID: ${req.params.userId}`, 404));
    }

    res.status(200).json({
        success: true,
        message: `Practitioner verification status updated.`,
        data: profile
    });
});

// --- Payout Management ---

exports.getPendingPayouts = asyncHandler(async (req, res, next) => {
    const payouts = await Payout.find({ status: 'requested' })
        .populate('practitioner', 'firstName lastName email');
        
    res.status(200).json({
        success: true,
        count: payouts.length,
        data: payouts
    });
});

exports.processPayout = asyncHandler(async (req, res, next) => {
    const { status, externalReference, adminNotes } = req.body;
    
    if (!status || !['completed', 'failed'].includes(status)) {
         return next(new ErrorResponse('Invalid status provided.', 400));
    }

    const payout = await Payout.findByIdAndUpdate(
        req.params.payoutId,
        { status, externalReference, adminNotes, processedAt: Date.now() },
        { new: true }
    );

    if (!payout) {
        return next(new ErrorResponse(`Payout request not found.`, 404));
    }

    res.status(200).json({
        success: true,
        data: payout
    });
});