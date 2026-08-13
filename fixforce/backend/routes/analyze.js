/**
 * FixForce – routes/analyze.js
 * POST /analyze-error
 */

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { analyzeWithAI, buildFallbackResponse } = require("../ai");
const { getDb } = require("../db");
const logger = require("../logger");

const router = express.Router();

// ─── Input Validation ─────────────────────────────────────────────────────────
function validateInput(body) {
  const errors = [];

  if (!body.errorText || typeof body.errorText !== "string") {
    errors.push("errorText is required and must be a string");
  } else if (body.errorText.trim().length < 3) {
    errors.push("errorText is too short");
  } else if (body.errorText.length > 5000) {
    errors.push("errorText is too long (max 5000 chars)");
  }

  return errors;
}

// ─── Mask sensitive data ──────────────────────────────────────────────────────
function maskSensitiveData(obj) {
  const masked = { ...obj };

  // Mask record IDs (Salesforce 15/18 char IDs)
  if (masked.recordId && typeof masked.recordId === "string") {
    masked.recordId = masked.recordId.slice(0, 4) + "***" + masked.recordId.slice(-3);
  }

  // Don't store full URLs (may contain session tokens)
  if (masked.url && typeof masked.url === "string") {
    try {
      const u = new URL(masked.url);
      masked.url = u.origin + u.pathname; // strip query params
    } catch (_) {
      masked.url = "[invalid url]";
    }
  }

  return masked;
}

// ─── POST /analyze-error ──────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    // Validate
    const validationErrors = validateInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "Invalid request",
        details: validationErrors,
        requestId,
      });
    }

    const { errorText, object, url, context, recordId } = req.body;

    logger.info("Analyzing error", {
      requestId,
      object: object || "unknown",
      context: context || "unknown",
      errorPreview: errorText.slice(0, 80),
    });

    // ─── AI Analysis ─────────────────────────────────────────────────────────
    let analysis;
    const hasApiKey = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-your-openai-key-here";

    if (hasApiKey) {
      try {
        analysis = await analyzeWithAI({ errorText, object, url, context });
      } catch (aiErr) {
        logger.warn("OpenAI call failed, using fallback", { error: aiErr.message, requestId });
        analysis = buildFallbackResponse(errorText, context);
        analysis._fallback = true;
      }
    } else {
      logger.warn("No OpenAI key configured – using rule-based fallback", { requestId });
      analysis = buildFallbackResponse(errorText, context);
      analysis._fallback = true;
    }

    const responseTime = Date.now() - startTime;

    // ─── Persist to MongoDB ───────────────────────────────────────────────────
    const maskedData = maskSensitiveData({ errorText, object, url, context, recordId });

    const dbRecord = {
      _id: requestId,
      ...maskedData,
      ...analysis,
      createdAt: new Date(),
      responseTimeMs: responseTime,
      ip: req.ip,
    };

    try {
      const db = await getDb();
      await db.collection("analyses").insertOne(dbRecord);
    } catch (dbErr) {
      // Non-fatal: log but don't fail the request
      logger.warn("Failed to persist analysis to MongoDB", {
        error: dbErr.message,
        requestId,
      });
    }

    logger.info("Analysis complete", {
      requestId,
      category: analysis.category,
      confidence: analysis.confidence,
      responseTimeMs: responseTime,
      fallback: !!analysis._fallback,
    });

    // Remove internal fields before responding
    const { _fallback, ...cleanAnalysis } = analysis;

    return res.status(200).json({
      requestId,
      ...cleanAnalysis,
      responseTimeMs: responseTime,
    });
  } catch (err) {
    const responseTime = Date.now() - startTime;
    logger.error("Unexpected error in /analyze-error", {
      error: err.message,
      stack: err.stack,
      requestId,
    });

    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to analyze error. Please try again.",
      requestId,
    });
  }
});

module.exports = router;
