const express = require("express");
const router = express.Router();

const registerController = require("../controllers/registerController");
const authController = require("../controllers/authController");

// -------------------------
// AUTHENTICATION ROUTES
// -------------------------

// 🔹 Register new user
router.post("/register", registerController.register);

// 🔹 Verify email
router.get("/verify-email/:token", registerController.verifyEmail);

// 🔹 Resend verification email
router.post("/resend-verification", registerController.resendVerification);

// 🔹 Login
router.post("/login", authController.login);

// 🔹 Refresh access token
router.post("/refresh-token", authController.refreshToken);

// 🔹 Logout
router.post("/logout", authController.logout);

// 🔹 Forgot password (send reset link)
router.post("/forgot-password", authController.forgotPassword);

// 🔹 Reset password (update password using token)
router.post("/reset-password/:token", authController.resetPassword);

module.exports = router;
