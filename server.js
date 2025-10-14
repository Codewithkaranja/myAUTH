// ==========================
// === LOAD ENVIRONMENT ===
// ==========================
require("dotenv").config(); // ✅ MUST be first line

const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const protect = require("./middleware/authMiddleware");

const app = express();

// ==========================
// === ENV CHECKS ===
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI not found in .env. Exiting...");
  process.exit(1);
}

// ==========================
// === DEBUG LOGGING ===
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.originalUrl}`);
  next();
});

// ==========================
// === MIDDLEWARES ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// ==========================
// === CORS CONFIGURATION ===
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://127.0.0.1:5500",
  "http://localhost:5500",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman, Thunder Client)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(
          new Error("CORS not allowed for this origin: " + origin)
        );
      }
    },
    credentials: true,
  })
);

// ==========================
// === DATABASE CONNECTION ===
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) =>
    console.error("❌ MongoDB connection error:", err.message)
  );

// ==========================
// === ROUTES ===
app.use("/api/auth", authRoutes); // ✅ All auth routes (register, login, etc.)

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
  console.warn(`⚠️ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: "❌ Route not found" });
});

// ==========================
// === SERVER START ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🚀 Server running on port ${PORT}`);

  // Log registered routes
  if (app._router && app._router.stack) {
    console.log("📌 Registered Routes:");
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        // Direct routes
        const methods = Object.keys(middleware.route.methods)
          .join(", ")
          .toUpperCase();
        console.log(`${methods} - ${middleware.route.path}`);
      } else if (middleware.name === "router" && middleware.handle.stack) {
        // Router middleware
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            const methods = Object.keys(handler.route.methods)
              .join(", ")
              .toUpperCase();
            console.log(`${methods} - ${handler.route.path}`);
          }
        });
      }
    });
  }
});
