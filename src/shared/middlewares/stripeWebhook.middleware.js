/**
 * stripeWebhook.middleware.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Stripe REQUIRES the raw (unparsed) request body to verify webhook signatures.
 * express.json() destroys the raw buffer, so the /webhook/stripe route must use
 * express.raw() INSTEAD of express.json().
 *
 * This middleware is applied ONLY to the webhook route in app.js — before the
 * global express.json() middleware.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');

// Returns raw Buffer — Stripe needs this exact bytes to verify HMAC signature
module.exports = express.raw({ type: 'application/json' });
