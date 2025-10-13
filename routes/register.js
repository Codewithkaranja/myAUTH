const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/User");

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    // 2. Create user (unverified)
    const user = new User({ email, password, isVerified: false });
    await user.save();

    // 3. Create a token
    const token = crypto.randomBytes(32).toString("hex");
    user.verificationToken = token;
    await user.save();

    // 4. Send email
    const verifyLink = `http://localhost:3000/api/auth/verify/${token}`;
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
    res.status(500).json({ message: "Server error", error });
  }
});
