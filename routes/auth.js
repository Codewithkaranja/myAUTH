const express = require("express");
const {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  resendVerification, // ✅ add this line
} = require("../controllers/authController");

const router = express.Router();

// === AUTH ROUTES ===
router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/resend-verification", resendVerification);
router.post("/logout", logout);

// === EMAIL VERIFICATION ===
router.get("/verify-email/:token", verifyEmail);

module.exports = router;
