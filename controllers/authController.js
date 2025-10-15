const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { generateToken, generateRefreshToken, verifyRefreshToken } = require("../utils/token");
const { sendEmail } = require("../utils/sendEmail");

let refreshTokens = []; // ⚠️ Temporary store — use DB or Redis in production

// ==========================
// LOGIN
// ==========================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    if (!user.isVerified) return res.status(403).json({ message: "Please verify your email before logging in." });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    refreshTokens.push(refreshToken);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: "✅ Logged in successfully",
      accessToken,
      refreshToken,
      user: { email: user.email, firstName: user.firstName },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
};

// ==========================
// REFRESH TOKEN
// ==========================
exports.refreshToken = (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token || !refreshTokens.includes(token)) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = verifyRefreshToken(token);
    if (!decoded) return res.status(403).json({ message: "Invalid token" });

    const newAccessToken = generateToken({ _id: decoded.id });
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.json({ message: "Access token refreshed successfully" });
  } catch (err) {
    console.error("❌ Refresh error:", err);
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

// ==========================
// LOGOUT
// ==========================
exports.logout = (req, res) => {
  const token = req.cookies.refreshToken;
  refreshTokens = refreshTokens.filter((t) => t !== token);

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  res.json({ message: "✅ Logged out successfully" });
};

// ==========================
// FORGOT PASSWORD
// ==========================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "No user found with this email" });

    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // ✅ Point to frontend HTML page, not backend
    // In authController forgotPassword function
const resetLink = `${process.env.CLIENT_URL}/reset-password.html?token=${resetToken}`;


    // Send reset email
    const html = `
      <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:30px;">
        <div style="max-width:500px; margin:auto; background:#fff; padding:25px; border-radius:10px;">
          <h2>Reset Your Password</h2>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <div style="text-align:center; margin:30px 0;">
            <a href="${resetLink}" style="background:#4f46e5; color:#fff; padding:12px 25px; text-decoration:none; border-radius:5px;">Reset Password</a>
          </div>
        </div>
      </div>
    `;

    await sendEmail(user.email, "🔑 Password Reset Request", html);

    res.json({ message: "✅ Password reset link sent to your email" });
  } catch (err) {
    console.error("❌ Forgot password error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ==========================
// RESET PASSWORD
// ==========================
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = password; // bcrypt hashing occurs in User model pre-save
    await user.save();

    res.json({ message: "✅ Password reset successfully. You can now log in." });
  } catch (err) {
    console.error("❌ Reset password error:", err);
    res.status(400).json({ message: "Invalid or expired token", error: err.message });
  }
};
// ==========================
// REGISTER + EMAIL VERIFICATION
// ==========================
exports.register = async (req, res) => {
  try {
    const { firstName, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ firstName, email, password, isVerified: false });

    // Create email verification token (expires in 1 day)
    const verifyToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // ✅ Use FRONTEND GitHub Pages link (NOT backend)
    const verifyUrl = `https://codewithkaranja.github.io/myAUTH/verify-email.html?token=${verifyToken}`;

    // Email content
    const html = `
      <div style="font-family:Arial, sans-serif;background:#f4f6f8;padding:30px;">
        <div style="max-width:500px;margin:auto;background:#fff;padding:25px;border-radius:10px;">
          <h2>Welcome to MyAuth 🎉</h2>
          <p>Click the button below to verify your email address:</p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${verifyUrl}" 
               style="background:#4f46e5;color:#fff;padding:12px 25px;
                      text-decoration:none;border-radius:5px;">Verify Email</a>
          </div>
          <p>If you didn’t create this account, please ignore this email.</p>
        </div>
      </div>
    `;

    await sendEmail(user.email, "✅ Verify Your Email", html);

    res.status(201).json({ message: "✅ Registration successful! Please check your email to verify your account." });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// ==========================
// VERIFY EMAIL
// ==========================
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user)
      return res.status(400).json({
        success: false,
        message: "Invalid token or user not found.",
      });

    if (user.isVerified)
      return res.json({
        success: true,
        message: "Email already verified ✅",
      });

    user.isVerified = true;
    await user.save();

    res.json({
      success: true,
      message: "Email verified successfully 🎉 You can now log in.",
    });
  } catch (err) {
    console.error("❌ Verification error:", err);
    res.status(400).json({
      success: false,
      message: "Invalid or expired verification link.",
    });
  }
};


