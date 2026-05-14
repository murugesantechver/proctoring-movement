/**
 * stripe.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Central wrapper for ALL Stripe SDK calls.
 * No controller or webhook should call the Stripe SDK directly — use this.
 *
 * Every function here returns the raw Stripe object so callers can pick
 * what they need. Errors are NOT caught here — let them bubble up so the
 * caller's try/catch (and DB transaction) can handle them properly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Stripe = require('stripe');

// Lazy-initialize so the SDK is only created after env vars are loaded
let _stripe = null;
const getStripe = () => {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set in environment');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  }
  return _stripe;
};

// ─── Customer ────────────────────────────────────────────────────────────────

/**
 * Create a Stripe Customer for an organization.
 * Call once per org — store the returned customer.id on the Organization row.
 */
exports.createCustomer = async ({ email, name, metadata = {} }) => {
  return getStripe().customers.create({ email, name, metadata });
};

/**
 * Retrieve a Stripe Customer by ID.
 */
exports.getCustomer = async (stripeCustomerId) => {
  return getStripe().customers.retrieve(stripeCustomerId);
};

/**
 * Update an existing Stripe Customer.
 */
exports.updateCustomer = async (stripeCustomerId, params) => {
  return getStripe().customers.update(stripeCustomerId, params);
};

// ─── Subscription ────────────────────────────────────────────────────────────

/**
 * Create a Stripe Subscription.
 * Returns a subscription with an embedded latest_invoice.payment_intent.client_secret
 * which the frontend uses to confirm the payment via Stripe.js.
 *
 * @param {string} stripeCustomerId
 * @param {string} stripePriceId      - The Stripe Price ID for the selected plan + cycle
 * @param {object} metadata           - Extra data stored on the Stripe subscription
 */
exports.createSubscription = async ({ stripeCustomerId, stripePriceId, metadata = {} }) => {
  return getStripe().subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: stripePriceId }],
    payment_behavior: 'default_incomplete',   // subscription starts as 'incomplete' until paid
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'], // returns client_secret for frontend
    metadata,
  });
};

/**
 * Retrieve a Stripe Subscription by ID.
 */
exports.getSubscription = async (stripeSubscriptionId) => {
  return getStripe().subscriptions.retrieve(stripeSubscriptionId);
};

/**
 * Cancel a Stripe Subscription.
 * cancel_at_period_end = true  → cancel at end of billing period (graceful)
 * cancel_at_period_end = false → cancel immediately
 */
exports.cancelSubscription = async (stripeSubscriptionId, atPeriodEnd = true) => {
  if (atPeriodEnd) {
    return getStripe().subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }
  return getStripe().subscriptions.cancel(stripeSubscriptionId);
};

/**
 * Upgrade or downgrade a subscription to a different price.
 * Stripe prorates the difference automatically.
 */
exports.updateSubscriptionPlan = async (stripeSubscriptionId, newStripePriceId) => {
  const subscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId);
  return getStripe().subscriptions.update(stripeSubscriptionId, {
    items: [{ id: subscription.items.data[0].id, price: newStripePriceId }],
    proration_behavior: 'always_invoice', // immediately charge/credit the difference
  });
};

// ─── Billing Portal ───────────────────────────────────────────────────────────

/**
 * Create a Stripe Customer Portal session.
 * The returned URL redirects the org's admin to a hosted Stripe page where
 * they can update card details, view invoices, cancel, etc.
 *
 * @param {string} stripeCustomerId
 * @param {string} returnUrl          - Where Stripe redirects after portal session
 */
exports.createBillingPortalSession = async (stripeCustomerId, returnUrl) => {
  return getStripe().billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
};

// ─── Invoices ─────────────────────────────────────────────────────────────────

/**
 * Retrieve a Stripe Invoice by ID.
 */
exports.getInvoice = async (stripeInvoiceId) => {
  return getStripe().invoices.retrieve(stripeInvoiceId);
};

// ─── Webhook ──────────────────────────────────────────────────────────────────

/**
 * Verify and parse an incoming Stripe webhook event.
 * Stripe requires the RAW request body (Buffer) — NOT the JSON-parsed body.
 * app.js must use express.raw() for the /webhook/stripe route.
 *
 * Throws a Stripe.errors.StripeSignatureVerificationError if the signature
 * is invalid — caller should return 400 in that case.
 *
 * @param {Buffer} rawBody      - req.body when route uses express.raw()
 * @param {string} signature    - req.headers['stripe-signature']
 */
exports.constructWebhookEvent = (rawBody, signature) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return getStripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
};

// ─── Products & Prices (used by plan admin) ───────────────────────────────────

/**
 * Create a Stripe Product (maps to your Plan).
 */
exports.createProduct = async ({ name, description, metadata = {} }) => {
  return getStripe().products.create({ name, description, metadata });
};

/**
 * Create a Stripe Price for a product.
 * @param {string} stripeProductId
 * @param {number} unitAmount        - Amount in cents (e.g. 4999 = $49.99)
 * @param {string} currency          - e.g. 'usd'
 * @param {string} interval          - 'month' | 'year'
 */
exports.createPrice = async ({ stripeProductId, unitAmount, currency = 'usd', interval }) => {
  return getStripe().prices.create({
    product: stripeProductId,
    unit_amount: unitAmount,
    currency,
    recurring: { interval },
  });
};

/**
 * Archive a Stripe Price (prices can't be deleted, only deactivated).
 */
exports.deactivatePrice = async (stripePriceId) => {
  return getStripe().prices.update(stripePriceId, { active: false });
};

/**
 * Archive a Stripe Product.
 */
exports.deactivateProduct = async (stripeProductId) => {
  return getStripe().products.update(stripeProductId, { active: false });
};
