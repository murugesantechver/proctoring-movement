const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();

// ── CRITICAL: Webhook route MUST be registered BEFORE express.json() ──────────
// Stripe signature verification requires the raw Buffer body.
// express.json() destroys the raw body, so this route uses express.raw() instead.
// If express.json() runs first, webhook signature verification will always fail.
const webhookRouter = require("./modules/webhook/webhook.router");
app.use("/api/webhook", webhookRouter);

// ── Global middleware (applied AFTER webhook route) ───────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ALB Health check
app.get("/health", (req, res) => res.status(200).send("OK"));

module.exports = app;