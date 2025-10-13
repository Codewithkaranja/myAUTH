require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const protect = require("./middleware/authMiddleware"); // optional: for protected routes

const app = express();

// ==========================
// === MIDDLEWARES ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "https://myauth-umk7.onrender.com",
    credentials: true,
  })
);

// ==========================
// === DATABASE CONNECTION ===
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// ==========================
// === ROUTES ===
app.use("/api/auth", authRoutes);

// Example protected route
app.get("/api/protected", protect, (req, res) => {
  res.json({ message: "🔒 Protected route access granted", user: req.user });
});

// Health check
app.get("/", (req, res) => {
  res.send("🚀 MyAuth Server is running smoothly...");
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ message: "❌ Route not found" });
});

// ==========================
// === SERVER START ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🚀 Server running on port ${PORT}`);
});
