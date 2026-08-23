/**
 * FixForce – server.js
 * Main Express application entry point.
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { connect: connectMongo, disconnect: disconnectMongo } = require("./db");
const logger = require("./logger");

const analyzeRouter = require("./routes/analyze");
const historyRouter = require("./routes/history");

const app = express();
const PORT = parseInt(process.env.PORT) || 3000;

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// CORS – allow Chrome extensions and local dev
const ALLOWED_ORIGINS_RAW = process.env.ALLOWED_ORIGINS || "";
const allowedOrigins = ALLOWED_ORIGINS_RAW.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      // Allow chrome-extension:// origins
      if (origin.startsWith("chrome-extension://")) return callback(null, true);
      // Allow explicitly listed origins
      if (allowedOrigins.some((o) => origin.startsWith(o))) return callback(null, true);
      // Allow localhost in dev
      if (
        process.env.NODE_ENV !== "production" &&
        (origin.includes("localhost") || origin.includes("127.0.0.1"))
      ) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-API-Key"],
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests – please slow down." },
  skip: () => process.env.NODE_ENV === "development", // no rate limit in dev
});

app.use("/analyze-error", limiter);

// ─── Optional API Key Auth ────────────────────────────────────────────────────
app.use((req, res, next) => {
  const secret = process.env.API_SECRET_KEY;
  if (!secret || secret === "change-me-in-production") return next(); // disabled

  const provided = req.headers["x-api-key"];
  if (provided !== secret) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  next();
});

// ─── Request Logging ──────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  res.json({
    status: "ok",
    service: "FixForce Backend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

app.use("/analyze-error", analyzeRouter);
app.use("/history", historyRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err, _req, res, _next) => {
  logger.error("Unhandled error", { error: err.message });
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ─── Startup ──────────────────────────────────────────────────────────────────
async function start() {
  try {
    await connectMongo();
  } catch (err) {
    logger.warn(
      "MongoDB connection failed – server will start without persistence",
      { error: err.message }
    );
  }

  app.listen(PORT, () => {
    logger.info(`FixForce backend running on http://localhost:${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-your-openai-key-here") {
      logger.warn(
        "⚠️  OPENAI_API_KEY not set – using rule-based fallback responses"
      );
    }
  });
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
async function shutdown(signal) {
  logger.info(`${signal} received – shutting down`);
  await disconnectMongo();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();

module.exports = app; // for testing
