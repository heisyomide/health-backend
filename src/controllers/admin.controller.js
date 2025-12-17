// src/controllers/admin.controller.js
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

const User = require('../models/User');
const PractitionerProfile = require('../models/PractitionerProfile');
const Payout = require('../models/Payout');

// --- Practitioner Management ---

// @desc    Get list of all practitioners for admin review
// @route   GET /api/v1/admin/practitioners
// @access  Private (Admin only)
exports.getPractitioners = asyncHandler(async (req, res, next) => {
    // Only fetch users with the 'practitioner' role and populate their profile
    const practitioners = await User.find({ role: 'practitioner' }).populate('practitionerProfile');
    
    res.status(200).json({
        success: true,
        count: practitioners.length,
        data: practitioners
    });
});


// @desc    Admin approves/rejects a practitioner profile for compliance (KYP)
// @route   PUT /api/v1/admin/practitioners/:userId/verify
// @access  Private (Admin only)
exports.verifyPractitioner = asyncHandler(async (req, res, next) => {
    const { isVerified, verificationNotes } = req.body;

    if (isVerified === undefined) {
        return next(new ErrorResponse('Please specify verification status (true/false).', 400));
    }

    // 1. Update the Practitioner Profile's verification status
    const profile = await PractitionerProfile.findOneAndUpdate(
        { user: req.params.userId },
        { 
            isVerified: isVerified,
            verificationNotes: verificationNotes,
            verifiedBy: req.user._id, // The admin who performed the action
            verifiedAt: Date.now()
        },
        { new: true }
    );

    if (!profile) {
        return next(new ErrorResponse(`Practitioner profile not found for user ID: ${req.params.userId}`, 404));
    }
    
    // 2. Optional: If verified, you may want to update the User status too
    // Example: await User.findByIdAndUpdate(req.params.userId, { isActive: true });

    res.status(200).json({
        success: true,
        message: `Practitioner ${profile.user} verification status updated to ${isVerified}.`,
        data: profile
    });
});


// --- Financial Management ---

// @desc    Get all pending payout requests
// @route   GET /api/v1/admin/payouts/pending
// @access  Private (Admin only)
exports.getPendingPayouts = asyncHandler(async (req, res, next) => {
    const payouts = await Payout.find({ status: 'requested' })
        .populate('practitioner', 'firstName lastName email'); // Show who requested it
        
    res.status(200).json({
        success: true,
        count: payouts.length,
        data: payouts
    });
});

// @desc    Admin processes a payout request
// @route   PUT /api/v1/admin/payouts/:payoutId/process
// @access  Private (Admin only)
exports.processPayout = asyncHandler(async (req, res, next) => {
    const { status, externalReference, adminNotes } = req.body;
    
    if (!status || !['completed', 'failed'].includes(status)) {
         return next(new ErrorResponse('Invalid status provided (must be completed or failed).', 400));
    }

    // 1. Update Payout Status
    const payout = await Payout.findByIdAndUpdate(
        req.params.payoutId,
        { 
            status,
            externalReference,
            adminNotes,
            processedAt: Date.now()
        },
        { new: true }
    );

    if (!payout) {
        return next(new ErrorResponse(`Payout request not found with ID ${req.params.payoutId}.`, 404));
    }

    // 2. Reversal Logic (If transfer failed)
    if (status === 'failed') {
        const amountToReverse = payout.amount;
        
        // Return funds to the practitioner's balance
        await Wallet.findOneAndUpdate(
            { practitioner: payout.practitioner },
            { $inc: { balance: amountToReverse } }
        );
        
        // TODO: Phase 6: Notify practitioner of failed payout and returned funds.
    }

    res.status(200).json({
        success: true,
        message: `Payout ID ${payout._id} status updated to ${status}.`,
        data: payout
    });
});