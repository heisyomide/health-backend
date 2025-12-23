const express = require("express");
const { protect } = require("../middlewares/auth.middleware");
const authController = require("../controllers/auth.controller");

const router = express.Router();

/**
 * IMPORTANT:
 * DO NOT call controller functions ()
 * Always pass the reference
 */
router.post("/signup", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", protect, authController.getMe);
router.put("/password", protect, authController.updatePassword);

module.exports = router;