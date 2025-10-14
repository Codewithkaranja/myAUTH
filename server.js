require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const protect = require("./middleware/authMiddleware");

const app = express();

// ==========================
// === CHECK REQUIRED ENV VARS ===
const requiredEnvs = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL"];
let missingEnv = false;

for (const key of requiredEnvs) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env variable: ${key}`);
    missingEnv = true;
  }
}

if (missingEnv) {
  console.error("❌ Exiting due to missing environment variables.");
  process.exit(1);
}

// ==========================
// === MIDDLEWARES ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// ==========================
// === DEBUG LOGGING ===
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.originalUrl}`);
  next();
});

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
      if (!origin) return callback(null, true); // allow Postman/Thunder Client
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS not allowed for origin: ${origin}`));
    },
    credentials: true,
  })
);

// ==========================
// === DATABASE CONNECTION WITH RETRY ===
const connectDB = async (retries = 5, delay = 3000) => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    if (retries > 0) {
      console.log(`🔁 Retrying to connect in ${delay / 1000}s... (${retries} retries left)`);
      setTimeout(() => connectDB(retries - 1, delay), delay);
    } else {
      console.error("❌ Could not connect to MongoDB. Server will still start, but DB routes may fail.");
    }
  }
};
connectDB();

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
        const methods = Object.keys(middleware.route.methods)
          .join(", ")
          .toUpperCase();
        console.log(`${methods} - ${middleware.route.path}`);
      } else if (middleware.name === "router" && middleware.handle.stack) {
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
