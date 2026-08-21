/**
 * FixForce – routes/history.js
 * GET /history — Retrieve past analyses
 * DELETE /history — Clear all history
 */

const express = require("express");
const { getDb } = require("../db");
const logger = require("../logger");

const router = express.Router();

// GET /history
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const category = req.query.category;

    const filter = {};
    if (category) filter.category = category.toUpperCase();

    const db = await getDb();
    const col = db.collection("analyses");

    const [items, total] = await Promise.all([
      col
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      col.countDocuments(filter),
    ]);

    return res.json({
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error("GET /history failed", { error: err.message });
    return res.status(500).json({ error: "Failed to fetch history" });
  }
});

// DELETE /history
router.delete("/", async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.collection("analyses").deleteMany({});
    return res.json({ deleted: result.deletedCount });
  } catch (err) {
    logger.error("DELETE /history failed", { error: err.message });
    return res.status(500).json({ error: "Failed to clear history" });
  }
});

module.exports = router;
