// server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import "dotenv/config";

import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";

import adminRouter from "./routes/adminRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
import userRouter from "./routes/userRoute.js";

const app = express();

// ---------------------------------------------------
// CONFIG
// ---------------------------------------------------
const PORT = Number(process.env.PORT) || 4000;

// Accept single, multiple, or "*" origins
// Accept single, multiple, or "*" origins
const rawOrigins =
  process.env.CORS_ORIGINS ??
  process.env.FRONTEND_URL ??
  "http://localhost:5173";

const allowedOrigins =
  rawOrigins === "*"
    ? ["*"]
    : rawOrigins.split(",").map((s) => s.trim()).filter(Boolean);

// ---------------------------------------------------
// GLOBAL MIDDLEWARE (single set)
// ---------------------------------------------------
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow Postman/curl
      if (allowedOrigins.includes("*")) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "aToken",
      "Accept",
      "X-Requested-With",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
  })
);


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ---------------------------------------------------
// PREVENT CLIENT-SIDE CACHING FOR API (avoid 304)
// ---------------------------------------------------
app.use("/api", (req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// ---------------------------------------------------
// ROUTES (single set)
// ---------------------------------------------------
app.get("/", (req, res) => {
  res.send("API WORKING");
});

// Debug route
app.post("/api/test", (req, res) => {
  console.log("TEST BODY:", req.body);
  res.json({ received: req.body });
});

// API Routers
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/user", userRouter);

// ---------------------------------------------------
// GLOBAL ERROR HANDLER
// ---------------------------------------------------
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err?.stack ?? err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server error",
  });
});

// ---------------------------------------------------
// START SERVER
// ---------------------------------------------------
const startServer = async () => {
  try {
    await connectDB();
    console.log("MongoDB connected");

    await connectCloudinary();
    console.log("Cloudinary connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log("Allowed CORS origins:", allowedOrigins);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
