const express = require("express");
const { protect } = require("../middlewares/auth.middleware");
const {
  register,
  login,
  logout,
  getMe,
  updatePassword,
} = require("../controllers/auth.controller");

const router = express.Router();

/* =====================================================
   AUTH ROUTES
===================================================== */

// Public
router.post("/signup", register);
router.post("/login", login);

// Protected
router.get("/me", protect, getMe);
router.post("/logout", protect, logout);
router.put("/update-password", protect, updatePassword);

module.exports = router;