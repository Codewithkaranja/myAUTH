// controllers/authController.js
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/tokenUtils");

let refreshTokens = []; // ⚠️ Temporary store — use Redis or DB in production

// ==========================
// === EMAIL TRANSPORTER ===
// ==========================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ==========================
// === REGISTER USER ===
// ==========================
exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      gender,
      dob,
      address,
      idNumber,
      phone,
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    const user = new User({
      firstName,
      lastName,
      email,
      password,
      gender,
      dob,
      address,
      idNumber,
      phone,
      isVerified: false,
    });

    await user.save();

    const verifyToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const verifyLink = `${process.env.CLIENT_URL}/api/auth/verify-email/${verifyToken}`;

    // Send verification email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: "✅ Verify your MyAuth account",
      html: `
        <div style="font-family: Arial, sans-serif; background: #f4f6f8; padding: 30px;">
          <div style="max-width: 500px; margin: auto; background: #fff; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h2 style="color:#333; text-align:center;">Welcome, ${user.firstName} 👋</h2>
            <p>Please verify your email to activate your account:</p>
            <div style="text-align:center; margin:30px 0;">
              <a href="${verifyLink}" style="background:#4f46e5; color:#fff; padding:12px 25px; text-decoration:none; border-radius:5px;">Verify Email</a>
            </div>
            <p style="font-size:13px; color:#888;">This link expires in 24 hours.</p>
          </div>
        </div>
      `,
    });

    res
      .status(201)
      .json({
        message:
          "✅ Registration successful! Check your email to verify your account.",
      });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// ==========================
// === VERIFY EMAIL ===
// ==========================
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user)
      return res.status(400).send("<h2>Invalid token or user not found.</h2>");

    if (user.isVerified)
      return res.send("<h2>Your email is already verified ✅</h2>");

    user.isVerified = true;
    await user.save();

    res.send("<h2>Email verified successfully 🎉 You can now log in.</h2>");
  } catch (err) {
    console.error("❌ Verification error:", err);
    res.status(400).send("<h2>Invalid or expired verification link.</h2>");
  }
};

// ==========================
// === RESEND VERIFICATION ===
// ==========================
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "No user found with this email" });

    if (user.isVerified)
      return res.status(400).json({ message: "Email already verified" });

    const verifyToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const verifyLink = `${process.env.CLIENT_URL}/api/auth/verify-email/${verifyToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: "🔄 Resend: Verify your MyAuth account",
      html: `
        <div style="font-family: Arial, sans-serif; background: #f4f6f8; padding: 30px;">
          <div style="max-width: 500px; margin: auto; background: #fff; padding: 25px; border-radius: 10px;">
            <h2 style="text-align:center;">Hey ${user.firstName} 👋</h2>
            <p>Here’s a new verification link for your account:</p>
            <div style="text-align:center; margin:30px 0;">
              <a href="${verifyLink}" style="background:#10b981; color:#fff; padding:12px 25px; text-decoration:none; border-radius:5px;">Verify My Email</a>
            </div>
            <p style="font-size:13px; color:#888;">Expires in 24 hours.</p>
          </div>
        </div>
      `,
    });

    res.json({ message: "✅ Verification email resent successfully" });
  } catch (err) {
    console.error("❌ Resend verification error:", err);
    res.status(500).json({ message: "Error resending verification email" });
  }
};

// ==========================
// === LOGIN ===
// ==========================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isVerified)
      return res
        .status(403)
        .json({ message: "Please verify your email before logging in." });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    refreshTokens.push(refreshToken);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
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
// === REFRESH TOKEN ===
// ==========================
exports.refreshToken = (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token || !refreshTokens.includes(token))
    return res.status(401).json({ message: "Unauthorized" });

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
// === LOGOUT ===
// ==========================
exports.logout = (req, res) => {
  const token = req.cookies.refreshToken;
  refreshTokens = refreshTokens.filter((t) => t !== token);

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  res.json({ message: "✅ Logged out successfully" });
};
