const express = require("express");
const { protect } = require("../middlewares/auth.middleware");
const authController = require("../controllers/auth.controller");

const router = express.Router();

/* =====================================================
   AUTH ROUTES
===================================================== */

// Public
router.post("/signup", authController.register);
router.post("/login", authController.login);

// Protected
router.get("/me", protect, authController.getMe);
router.post("/logout", protect, authController.logout);
router.put("/update-password", protect, authController.updatePassword);

module.exports = router;