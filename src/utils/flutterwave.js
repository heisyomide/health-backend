// src/utils/flutterwave.js
const axios = require('axios');
const ErrorResponse = require('../utils/errorResponse');

// Load keys from environment variables
const FLW_BASE_URL = process.env.FLUTTERWAVE_BASE_URL;
const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

// Headers required for Flutterwave API (using Bearer token for authorization)
const config = {
    headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
    },
};

/**
 * @desc Initiates a payment transaction via Flutterwave's standard payment link/redirect.
 * @param {object} paymentData - Details required for the payment (tx_ref, amount, currency, customer, etc.).
 */
exports.initiatePayment = async (paymentData) => {
    try {
        const url = `${FLW_BASE_URL}/payments`;
        const response = await axios.post(url, paymentData, config);
        
        // Check if Flutterwave responded with success
        if (response.data.status === 'success') {
            return response.data.data.link; // Return the payment redirect link
        } else {
            // Throw an error if Flutterwave's own status is not 'success'
            throw new ErrorResponse(`Flutterwave initiation failed: ${response.data.message}`, 400);
        }
    } catch (err) {
        // Handle network errors or axios/ErrorResponse exceptions
        console.error('Flutterwave initiation error:', err.response ? err.response.data : err.message);
        throw new ErrorResponse('Payment initiation service failed.', 500);
    }
};

/**
 * @desc Verifies a completed transaction using the Flutterwave transaction ID.
 * @param {string} transactionId - The Flutterwave transaction ID (ID from the webhook payload).
 */
exports.verifyPayment = async (transactionId) => {
    try {
        // Note: Flutterwave verification URL uses the transaction ID, not the reference.
        const url = `${FLW_BASE_URL}/transactions/${transactionId}/verify`; 
        const response = await axios.get(url, config);

        if (response.data.status === 'success') {
            return response.data.data; // Returns the full transaction object
        } else {
            throw new ErrorResponse(`Flutterwave verification failed: ${response.data.message}`, 400);
        }
    } catch (err) {
        console.error('Flutterwave verification error:', err.response ? err.response.data : err.message);
        throw new ErrorResponse('Payment verification service failed.', 500);
    }
};