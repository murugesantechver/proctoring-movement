/**
 * webhook.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Stripe webhook receiver — the ONLY trusted source for activating subscriptions.
 *
 * Security rules:
 *  1. Signature verified via HMAC before any processing (rejects tampered requests)
 *  2. Idempotent — duplicate webhook events are silently ignored
 *  3. All DB writes are wrapped in Sequelize transactions (ACID)
 *  4. Returns 500 on DB failure so Stripe retries the webhook automatically
 *  5. Returns 200 immediately after successful processing
 *
 * IMPORTANT: This route must receive the RAW request body (Buffer).
 *            The stripeWebhook.middleware.js handles this — do NOT use express.json() here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const stripeService = require('../../shared/services/stripe.service');
const subscriptionService = require('../../shared/services/subscription.service');

exports.handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  // ── Step 1: Verify Stripe signature ───────────────────────────────────────
  // req.body is a raw Buffer here (stripeWebhook.middleware.js ensures this)
  let event;
  try {
    event = stripeService.constructWebhookEvent(req.body, signature);
  } catch (err) {
    // Invalid signature — reject immediately
    console.error('[webhook] ❌ Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  console.log(`[webhook] ✅ Received event: ${event.type} | id: ${event.id}`);

  // ── Step 2: Route to the correct handler ──────────────────────────────────
  try {
    switch (event.type) {

      // ── Payment succeeded → activate / renew subscription ─────────────────
      case 'invoice.paid': {
        const invoice = event.data.object;
        // Only process subscription invoices (not one-off)
        if (!invoice.subscription) {
          console.log('[webhook] invoice.paid — no subscription attached, skipping');
          break;
        }
        const result = await subscriptionService.activateFromWebhook(invoice);
        if (result?.alreadyProcessed) {
          console.log(`[webhook] invoice ${invoice.id} already processed — idempotent skip`);
        }
        break;
      }

      // ── Payment failed → mark past_due, org needs to update card ──────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await subscriptionService.handlePaymentFailed(invoice);
        console.log(`[webhook] invoice.payment_failed handled for invoice ${invoice.id}`);
        break;
      }

      // ── Subscription updated (plan change, cancel toggle, renewal) ─────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await subscriptionService.syncSubscriptionUpdate(subscription);
        console.log(`[webhook] customer.subscription.updated synced for ${subscription.id}`);
        break;
      }

      // ── Subscription deleted (hard canceled) ──────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await subscriptionService.handleSubscriptionCanceled(subscription);
        console.log(`[webhook] customer.subscription.deleted handled for ${subscription.id}`);
        break;
      }

      // ── Subscription created (first time — status: incomplete until paid) ──
      case 'customer.subscription.created': {
        // No action needed — we handle activation on invoice.paid
        console.log(`[webhook] customer.subscription.created — waiting for invoice.paid`);
        break;
      }

      // ── Trial ending soon (optional: send reminder email) ──────────────────
      case 'customer.subscription.trial_will_end': {
        console.log(`[webhook] trial_will_end — future: send reminder email`);
        break;
      }

      // ── Any other event — log and acknowledge ──────────────────────────────
      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }

    // ── Step 3: Always return 200 after processing ─────────────────────────
    // Stripe considers any 2xx as success. Non-2xx = Stripe will retry.
    return res.status(200).json({ received: true, event: event.type });

  } catch (error) {
    // DB or business logic failure — return 500 so Stripe retries
    console.error(`[webhook] ❌ Handler failed for ${event.type}:`, error.message);
    return res.status(500).json({ error: 'Webhook handler failed — will retry' });
  }
};
