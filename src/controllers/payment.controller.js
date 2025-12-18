// src/controllers/payment.controller.js
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { initiatePayment, verifyPayment } = require('../utils/flutterwave');
// Ensure you import sendEmail at the top of your payment.controller.js
const sendEmail = require('../utils/sendEmail');
const User = require('../models/User'); // Needed to find patient email
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const Wallet = require('../models/Wallet');
const Payout = require('../models/Payout');

// --- INTERNAL HELPER: Releases funds from escrow to practitioner balance ---

/**
 * @desc Releases funds from escrow to the practitioner's available balance.
 * This is called internally when an appointment status changes to 'Completed'.
 */
exports.releaseFundsAndSplit = async (appointmentId) => {
    // 1. Find the held payment record and update its status
    const payment = await Payment.findOneAndUpdate(
        { appointment: appointmentId, status: 'held' },
        { status: 'completed', releasedAt: Date.now() },
        { new: true }
    );

    if (!payment) {
        console.warn(`Attempted to release funds for APPOINTMENT ID ${appointmentId}, but no held payment found (already released or refunded).`);
        return;
    }

    const { practitioner, practitionerShare } = payment;

    // 2. Transfer funds from pending to available balance in the Wallet
    await Wallet.findOneAndUpdate(
        { practitioner: practitioner },
        {
            $inc: {
                pendingBalance: -practitionerShare, // Deduct from pending
                balance: practitionerShare,         // Add to available balance
                totalEarned: practitionerShare      // Update lifetime earnings
            }
        }
    );

    console.log(`Funds released for Appointment ID ${appointmentId}. Practitioner Balance updated.`);
};

// --- PUBLIC API ENDPOINTS ---

// @desc    Initiate payment for an appointment
// @route   POST /api/v1/payments/initiate
// @access  Private (Patient only)
exports.initiateAppointmentPayment = asyncHandler(async (req, res, next) => {
    const { appointmentId, currency, amount } = req.body;
    
    if (!appointmentId || !amount || !currency) {
        return next(new ErrorResponse('Missing appointmentId, amount, or currency.', 400));
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment || appointment.patient.toString() !== req.user.id) {
        return next(new ErrorResponse('Appointment not found or not authorized.', 404));
    }

    // A unique reference linking our system to Flutterwave (e.g., apptId-timestamp)
    const tx_ref = `HLTH-${appointmentId}-${Date.now()}`;
    
    const paymentData = {
        tx_ref: tx_ref,
        amount: amount,
        currency: currency,
        redirect_url: process.env.FRONTEND_PAYMENT_CALLBACK_URL || 'http://localhost:3000/payment-success',
        customer: {
            email: req.user.email,
            phonenumber: req.user.contactNumber || 'N/A', 
            name: `${req.user.firstName} ${req.user.lastName}`,
        },
        customizations: {
            title: "HealthMe Appointment Fee",
            description: `Payment for appointment ID: ${appointmentId}`,
        },
    };

    const paymentLink = await initiatePayment(paymentData);

    res.status(200).json({
        success: true,
        message: 'Payment initiated. Redirect to link to continue.',
        data: {
            paymentLink,
            tx_ref
        }
    });
});



// @desc    Handle Flutterwave Webhook/Callback - **CRITICAL**
// @route   POST /api/v1/payments/webhook
// @access  Public (External Webhook)
exports.handleWebhook = asyncHandler(async (req, res, next) => {
    const secretHash = req.headers['verif-hash'];
    const COMMISSION_RATE = 0.10; // 10% Commission (Phase 1)
    
    // 1. Verify the Secret Hash (Security)
    if (!secretHash || secretHash !== process.env.FLUTTERWAVE_WEBHOOK_SECRET) {
        console.error('Webhook verification failed: Invalid secret hash.');
        return res.status(200).send("Verification failed."); 
    }

    const payload = req.body;
    
    // 2. Check Event and Status
    if (payload.event !== 'charge.completed' || payload.data.status !== 'successful') {
        return res.status(200).send("Event acknowledged, not a successful charge.");
    }

    const { id: flwTransactionId, tx_ref, amount, app_fee: flutterwaveFee } = payload.data;
    
    // 3. Verify Transaction
    const verifiedData = await verifyPayment(flwTransactionId);
    
    // Check for duplicate processing
    const existingPayment = await Payment.findOne({ flwTransactionId });
    if (existingPayment) {
        console.warn(`Duplicate webhook received for FLW ID: ${flwTransactionId}`);
        return res.status(200).send("Duplicate transaction processed.");
    }
    
    // 4. Calculate Split & Escrow Setup
    const appointmentId = tx_ref.split('-')[1]; 
    const appointment = await Appointment.findById(appointmentId).populate('patient'); // Populate to get patient details

    if (!appointment) {
         console.error(`Webhook error: Appointment not found for TX ref: ${tx_ref}`);
         return res.status(200).send("Appointment not found.");
    }
    
    const platformFee = amount * COMMISSION_RATE;
    const practitionerShare = amount - platformFee; 
    
    // 5. Create Payment Record
    const payment = await Payment.create({
        appointment: appointmentId,
        patient: appointment.patient._id,
        practitioner: appointment.practitioner,
        flwTransactionId: flwTransactionId,
        flwReference: tx_ref,
        grossAmount: amount,
        flutterwaveFee: flutterwaveFee || 0,
        platformFee: platformFee,
        practitionerShare: practitionerShare,
        status: 'held',
    });

    // 6. Update Practitioner Wallet
    await Wallet.findOneAndUpdate(
        { practitioner: appointment.practitioner },
        { $inc: { pendingBalance: practitionerShare } },
        { upsert: true, new: true }
    );

    // 7. NEW: Send Email Notification to Patient
    try {
        await sendEmail({
            email: appointment.patient.email, // Fetched via .populate('patient') above
            subject: 'Payment Confirmed - HealthMe',
            message: `Hi ${appointment.patient.firstName}, your payment of ₦${amount.toLocaleString()} for Appointment #${appointmentId} was successful. The funds are being held in escrow until the service is completed.`,
        });
    } catch (err) {
        console.error(`Email failed to send to ${appointment.patient.email}:`, err.message);
        // We don't return an error to Flutterwave just because the email failed
    }

    res.status(200).send("Webhook successfully processed, funds held in escrow.");
});

// @desc    Get Practitioner's Wallet Status
// @route   GET /api/v1/payments/wallet
// @access  Private (Practitioner only)
exports.getWalletStatus = asyncHandler(async (req, res, next) => {
    const wallet = await Wallet.findOne({ practitioner: req.user._id });

    if (!wallet) {
        // Create wallet on demand if not found
        const newWallet = await Wallet.create({ practitioner: req.user._id });
        return res.status(200).json({ success: true, data: newWallet });
    }

    res.status(200).json({
        success: true,
        data: wallet,
    });
});

// @desc    Practitioner requests withdrawal from their available balance
// @route   POST /api/v1/payments/withdraw
// @access  Private (Practitioner only)
exports.requestWithdrawal = asyncHandler(async (req, res, next) => {
    const { amount, bankDetails } = req.body; // bankDetails should contain { bankName, accountNumber }
    const practitionerId = req.user._id;
    const MIN_WITHDRAWAL_AMOUNT = 5000; // ₦5,000

    if (!amount || amount <= 0) {
        return next(new ErrorResponse('Invalid withdrawal amount.', 400));
    }
    if (amount < MIN_WITHDRAWAL_AMOUNT) {
        return next(new ErrorResponse(`Minimum withdrawal amount is ₦${MIN_WITHDRAWAL_AMOUNT.toLocaleString()}.`, 400));
    }

    // 1. Fetch and Check the Wallet
    const wallet = await Wallet.findOne({ practitioner: practitionerId });
    
    if (!wallet) {
        return next(new ErrorResponse('Wallet not found.', 404));
    }
    if (wallet.balance < amount) {
        return next(new ErrorResponse(`Insufficient balance. Available: ₦${wallet.balance.toLocaleString()}.`, 400));
    }

    // 2. Deduct the amount from the available balance
    wallet.balance -= amount;
    await wallet.save();

    // 3. Create a Payout Request Log (for Admin processing)
    const payout = await Payout.create({
        practitioner: practitionerId,
        amount: amount,
        bankDetails: bankDetails, 
        status: 'requested',
    });

    res.status(200).json({
        success: true,
        message: 'Withdrawal requested successfully. Admin processing initiated.',
        data: {
            payoutId: payout._id,
            newBalance: wallet.balance,
        }
    });
});