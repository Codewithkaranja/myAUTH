// server.js - deploy-safe version
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const protect = require("./middleware/authMiddleware");

const app = express();

// ---------- DEBUG / GLOBAL ERROR HANDLING ----------
process.on("unhandledRejection", (reason, p) => {
  console.error("UNHANDLED REJECTION at Promise:", p, "reason:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

// ---------- CHECK ENV VARS (LOG BUT DO NOT EXIT) ----------
const requiredEnvs = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL"];
const missing = requiredEnvs.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn("❗ Missing required env variables (will not exit):", missing.join(", "));
} else {
  console.log("✅ All required env variables appear present.");
}

// ---------- MIDDLEWARE ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// Simple request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ---------- CORS ----------
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://127.0.0.1:5500",
  "http://localhost:5500",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow Postman/Thunder Client
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Log the blocked origin for debugging
      console.warn(`Blocked CORS origin: ${origin}`);
      callback(new Error(`CORS not allowed for origin: ${origin}`));
    },
    credentials: true,
  })
);

// ---------- DB CONNECTION WITH EXPONENTIAL BACKOFF ----------
const connectWithRetry = async (attempt = 1) => {
  const maxAttempts = 10;
  const baseDelay = 2000; // 2s
  if (!process.env.MONGO_URI) {
    console.warn("Skipping Mongo connect attempt: MONGO_URI not provided.");
    return;
  }

  try {
    console.log(`Attempting MongoDB connect (attempt ${attempt})...`);
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error(`MongoDB connect error (attempt ${attempt}):`, err.message || err);
    if (attempt < maxAttempts) {
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Retrying MongoDB in ${Math.round(delay / 1000)}s...`);
      setTimeout(() => connectWithRetry(attempt + 1), delay);
    } else {
      console.error("❌ Max MongoDB connection attempts reached. Will keep server running without DB.");
    }
  }
};
connectWithRetry();

// ---------- ROUTES ----------
app.use("/api/auth", authRoutes);
app.get("/api/protected", protect, (req, res) => {
  res.json({ message: "🔒 Protected route access granted", user: req.user });
});
app.get("/", (req, res) => res.send("🚀 MyAuth Server (deploy-safe) is running..."));

// 404
app.use((req, res) => {
  console.warn(`404 - ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: "❌ Route not found" });
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🚀 Server listening on port ${PORT}`);
  // print env debug summary (non-sensitive)
  console.log("ENV SUMMARY:");
  console.log(" - MONGO_URI present:", !!process.env.MONGO_URI);
  console.log(" - JWT_SECRET present:", !!process.env.JWT_SECRET);
  console.log(" - CLIENT_URL present:", !!process.env.CLIENT_URL);

  // dump registered routes (helpful in deploy logs)
  try {
    if (app._router && app._router.stack) {
      console.log("📌 Registered Routes:");
      app._router.stack.forEach((m) => {
        if (m.route) {
          const methods = Object.keys(m.route.methods).join(", ").toUpperCase();
          console.log(`${methods} - ${m.route.path}`);
        } else if (m.name === "router" && m.handle && m.handle.stack) {
          m.handle.stack.forEach((h) => {
            if (h.route) {
              const methods = Object.keys(h.route.methods).join(", ").toUpperCase();
              console.log(`${methods} - ${h.route.path}`);
            }
          });
        }
      });
    }
  } catch (e) {
    console.warn("Could not enumerate routes:", e);
  }
});
