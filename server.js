const express = require("express");
const cors = require("cors");
require("dotenv").config();

// DATABASE
const connectDB = require("./database/db");

// ROUTES
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const jazzcashRoutes = require("./routes/jazzcashRoutes");

const app = express();
const port = process.env.PORT || 3000;

// =========================
// CORS CONFIGURATION
// =========================

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",

  // Main Vercel Domain
  "https://aka-wmart.vercel.app",

  // Preview Deployment
  "https://aka-wmart-hkhlpfmcc-hassan-ahmeds-projects-33136561.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin
      // (Postman, mobile apps, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ Blocked by CORS:", origin);

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// =========================
// MIDDLEWARE
// =========================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// =========================
// DATABASE CONNECTION
// =========================

connectDB();

// =========================
// API ROUTES
// =========================

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/jazzcash", jazzcashRoutes);

// =========================
// HEALTH CHECK ROUTE
// =========================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AKA_WMart Backend Running Successfully 🚀",
  });
});

// =========================
// 404 ROUTE HANDLER
// =========================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});

// =========================
// GLOBAL ERROR HANDLER
// =========================

app.use((err, req, res, next) => {
  console.error("❌ SERVER ERROR:", err.message);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// =========================
// START SERVER
// =========================

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});