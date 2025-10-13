// ==========================
// === SERVER ENTRY POINT ===
// ==========================

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const protect = require("./middleware/authMiddleware");

const app = express();

// ==========================
// === MIDDLEWARES ===
// ==========================
app.use(express.json());
app.use(express.static("public")); // serve HTML files from /public
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000", // dynamic CORS
    credentials: true, // allow cookies
  })
);

// ==========================
// === DATABASE CONNECTION ===
// ==========================
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// ==========================
// === ROUTES ===
// ==========================
app.use("/api/auth", authRoutes); // authentication routes

// Example protected route
app.get("/api/protected", protect, (req, res) => {
  res.json({
    message: "🔒 Protected route access granted",
    user: req.user,
  });
});

// Health check route
app.get("/", (req, res) => {
  res.send("🚀 MyAuth Server is running smoothly...");
});

// ==========================
// === SERVER START ===
// ==========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🚀 Server running on port ${PORT}`);
});
