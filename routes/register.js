const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/User");

router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, gender, dob, address, idNumber, phone } = req.body;

    // 1. Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    // 2. Create user
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

    // 3. Generate verification token
    const token = crypto.randomBytes(32).toString("hex");
    user.verificationToken = token;
    await user.save();

    // 4. Send email
    const verifyLink = `https://myauth-umk7.onrender.com/api/auth/verify-email/${token}`;
    await sendEmail(
      email,
      "Verify your account",
      `<p>Click below to verify your email:</p>
       <a href="${verifyLink}">${verifyLink}</a>`
    );

    res.status(201).json({
      message: "User registered. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
