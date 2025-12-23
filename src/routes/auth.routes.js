// src/routes/auth.routes.js
const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const authController = require('../controllers/auth.controller');

// DEBUG: Log the imported controller to see what's missing
console.log('--- AUTH CONTROLLER DEBUG ---');
console.log('Register:', typeof authController.register);
console.log('Login:', typeof authController.login);
console.log('Logout:', typeof authController.logout);
console.log('GetMe:', typeof authController.getMe);
console.log('UpdatePassword:', typeof authController.updatePassword);
console.log('-----------------------------');

const router = express.Router();

// Destructure AFTER logging so we can see the issue
const { register, login, logout, getMe, updatePassword } = authController;

// Only mount the routes if the functions exist to prevent the crash
router.post("/signup", register);   // ✅ NO ()
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.put("/password", protect, updatePassword);

module.exports = router;