const express = require("express");
const authController = require("../controllers/authController");
const registerController = require("../controllers/registerController");

const router = express.Router();

// === AUTH ROUTES ===
router.post("/register", registerController.register);
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/resend-verification", registerController.resendVerification);
router.post("/logout", authController.logout);

// === EMAIL VERIFICATION ===
router.get("/verify-email/:token", registerController.verifyEmail);

module.exports = router;
