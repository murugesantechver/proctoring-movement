const express = require('express');
const router = express.Router();
const webhookController = require('./webhook.controller');
const stripeRawBody = require('../../shared/middlewares/stripeWebhook.middleware');

// CRITICAL: stripeRawBody middleware MUST be applied here (express.raw).
// This route must NOT go through the global express.json() middleware in app.js.
// The route registration order in app.js handles this — webhook is registered
// BEFORE express.json() is applied.

router.post('/stripe', stripeRawBody, webhookController.handleStripeWebhook);

module.exports = router;
