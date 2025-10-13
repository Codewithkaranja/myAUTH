const User = require("../models/User");
const { generateToken, generateRefreshToken, verifyRefreshToken } = require("../utils/token");

let refreshTokens = []; // ⚠️ Temporary store — use DB or Redis in production

// -------------------------
// LOGIN
// -------------------------
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

    res.cookie("accessToken", accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 15 * 60 * 1000 });
    res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({ message: "✅ Logged in successfully", accessToken, refreshToken, user: { email: user.email, firstName: user.firstName } });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
};

// -------------------------
// REFRESH TOKEN
// -------------------------
exports.refreshToken = (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token || !refreshTokens.includes(token)) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = verifyRefreshToken(token);
    if (!decoded) return res.status(403).json({ message: "Invalid token" });

    const newAccessToken = generateToken({ _id: decoded.id });
    res.cookie("accessToken", newAccessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 15 * 60 * 1000 });

    res.json({ message: "Access token refreshed successfully" });
  } catch (err) {
    console.error("❌ Refresh error:", err);
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

// -------------------------
// LOGOUT
// -------------------------
exports.logout = (req, res) => {
  const token = req.cookies.refreshToken;
  refreshTokens = refreshTokens.filter((t) => t !== token);

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  res.json({ message: "✅ Logged out successfully" });
};
