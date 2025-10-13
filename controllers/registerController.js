const User = require("../models/User");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

// -------------------------
// REGISTER
// -------------------------
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, gender, dob, address, idNumber, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    const user = new User({ firstName, lastName, email, password, gender, dob, address, idNumber, phone });
    await user.save();

    // Generate verification token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    const verifyLink = `${process.env.CLIENT_URL}/api/auth/verify-email/${token}`;

    // Send verification email
    await sendEmail(user.email, "Verify Your Account", `
      <h2>Welcome, ${user.firstName}</h2>
      <p>Click below to verify your email:</p>
      <a href="${verifyLink}">Verify Email</a>
    `);

    res.status(201).json({ message: "✅ Registration successful! Check your email to verify your account." });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// -------------------------
// VERIFY EMAIL
// -------------------------
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).send("<h2>Invalid token or user not found.</h2>");

    if (user.isVerified) return res.send("<h2>Email already verified ✅</h2>");

    user.isVerified = true;
    await user.save();

    res.send("<h2>Email verified successfully 🎉 You can now log in.</h2>");
  } catch (err) {
    console.error("❌ Verification error:", err);
    res.status(400).send("<h2>Invalid or expired verification link.</h2>");
  }
};

// -------------------------
// RESEND VERIFICATION EMAIL
// -------------------------
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "No user found with this email" });
    if (user.isVerified) return res.status(400).json({ message: "Email already verified" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    const verifyLink = `${process.env.CLIENT_URL}/api/auth/verify-email/${token}`;

    await sendEmail(user.email, "Resend: Verify Your Account", `
      <h2>Hi ${user.firstName}</h2>
      <p>Here’s a new verification link for your account:</p>
      <a href="${verifyLink}">Verify Email</a>
    `);

    res.json({ message: "✅ Verification email resent successfully" });
  } catch (err) {
    console.error("❌ Resend verification error:", err);
    res.status(500).json({ message: "Error resending verification email" });
  }
};
