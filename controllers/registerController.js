const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { sendVerificationEmail } = require("../utils/sendEmail"); // Mailtrap helper

// -------------------------
// REGISTER
// -------------------------
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, gender, dob, address, idNumber, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }, { idNumber }],
    });

    if (existingUser) {
      const field =
        existingUser.email === email
          ? "Email"
          : existingUser.phone === phone
          ? "Phone"
          : "ID Number";
      return res.status(400).json({ message: `${field} already registered` });
    }

    // Create and save new user
    const user = new User({ firstName, lastName, email, password, gender, dob, address, idNumber, phone });
    await user.save();

    // Generate verification token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // Send verification email via Mailtrap helper
    try {
      await sendVerificationEmail(user, token);
    } catch (err) {
      console.error("❌ Verification email failed:", err.message);
    }

    res.status(201).json({ message: "✅ Registration successful! Check your email to verify your account." });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: "Server error during registration", error: err.message });
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

    // Generate new verification token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // Send verification email via Mailtrap helper
    try {
      await sendVerificationEmail(user, token);
    } catch (err) {
      console.error("❌ Resend verification email failed:", err.message);
    }

    res.json({ message: "✅ Verification email resent successfully" });
  } catch (err) {
    console.error("❌ Resend verification error:", err);
    res.status(500).json({ message: "Error resending verification email", error: err.message });
  }
};
