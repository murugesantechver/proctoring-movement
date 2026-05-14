/**
 * subscription.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All subscription business logic that requires DB writes.
 * Every write that touches multiple tables uses a Sequelize transaction
 * so we get full ACID guarantees — no half-activated subscriptions.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const db = require('../../models/models');
const stripeService = require('./stripe.service');
const invoiceService = require('./invoice.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get or create a Stripe Customer for an organization.
 * Ensures we never create duplicate Stripe customers for the same org.
 */
exports.getOrCreateStripeCustomer = async (organization) => {
  if (organization.stripe_customer_id) {
    return organization.stripe_customer_id;
  }

  const customer = await stripeService.createCustomer({
    email: organization.billing_email || organization.contact_email,
    name: organization.billing_name || organization.name,
    metadata: { organization_id: String(organization.id) },
  });

  await organization.update({ stripe_customer_id: customer.id });
  return customer.id;
};

// ─── Checkout ─────────────────────────────────────────────────────────────────

exports.createCheckout = async ({ organization_id, plan_id, billing_cycle }) => {
  const organization = await db.Organization.findByPk(organization_id);
  if (!organization) throw new Error('Organization not found');

  const plan = await db.Plan.findOne({ where: { id: plan_id, is_active: true } });
  if (!plan) throw new Error('Plan not found or inactive');

  const stripePriceId = billing_cycle === 'yearly'
    ? plan.stripe_price_yearly_id
    : plan.stripe_price_monthly_id;

  if (!stripePriceId) {
    throw new Error(`No Stripe price configured for plan "${plan.name}" on ${billing_cycle} cycle`);
  }

  const stripeCustomerId = await exports.getOrCreateStripeCustomer(organization);

  const stripeSubscription = await stripeService.createSubscription({
    stripeCustomerId,
    stripePriceId,
    metadata: { organization_id: String(organization_id), plan_id: String(plan_id), billing_cycle },
  });

  const stripeInvoiceId = stripeSubscription.latest_invoice?.id;
  const clientSecret = stripeSubscription.latest_invoice?.payment_intent?.client_secret;
  const amount = billing_cycle === 'yearly' ? plan.yearly_amount : plan.monthly_amount;

  const payment = await db.Payment.create({
    organization_id,
    plan_id,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscription.id,
    stripe_invoice_id: stripeInvoiceId,
    amount,
    currency: plan.currency,
    billing_cycle,
    status: 'pending',
    idempotency_key: stripeInvoiceId,
    metadata: { stripe_subscription_id: stripeSubscription.id },
  });

  return {
    client_secret: clientSecret,
    stripe_subscription_id: stripeSubscription.id,
    payment_id: payment.id,
    amount,
    currency: plan.currency,
  };
};

// ─── Activate from Webhook (invoice.paid) ─────────────────────────────────────

exports.activateFromWebhook = async (stripeInvoice) => {
  const {
    id: stripeInvoiceId,
    subscription: stripeSubscriptionId,
    amount_paid,
    currency,
    hosted_invoice_url,
    invoice_pdf,
    period_start,
    period_end,
    lines,
  } = stripeInvoice;

  // Idempotency check — already processed? skip silently
  const existingPayment = await db.Payment.findOne({
    where: { idempotency_key: stripeInvoiceId },
  });

  if (existingPayment && existingPayment.status === 'paid') {
    console.log(`[subscription.service] Invoice ${stripeInvoiceId} already processed — skipping`);
    return { alreadyProcessed: true };
  }

  const sequelize = db.getSequelize();
  const t = await sequelize.transaction();

  try {
    // 1. Find pending Payment
    const payment = await db.Payment.findOne({
      where: { idempotency_key: stripeInvoiceId },
      transaction: t,
    });

    if (!payment) {
      throw new Error(`Payment record not found for invoice ${stripeInvoiceId}`);
    }

    const { organization_id, plan_id, billing_cycle } = payment;

    // 2. Update Payment → paid
    await payment.update({
      status: 'paid',
      stripe_payment_intent_id: stripeInvoice.payment_intent,
      paid_at: new Date(),
      metadata: stripeInvoice,
    }, { transaction: t });

    // 3. Upsert Subscription
    let subscription = await db.Subscription.findOne({
      where: { stripe_subscription_id: stripeSubscriptionId },
      transaction: t,
    });

    const periodStart = period_start ? new Date(period_start * 1000) : new Date();
    const periodEnd = period_end
      ? new Date(period_end * 1000)
      : lines?.data?.[0]?.period?.end
        ? new Date(lines.data[0].period.end * 1000)
        : null;

    if (subscription) {
      // Renewal
      await subscription.update({
        status: 'active',
        plan_id,
        payment_id: payment.id,
        billing_cycle,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        canceled_at: null,
      }, { transaction: t });
    } else {
      // First activation
      const planRow = await db.Plan.findByPk(plan_id, { transaction: t });

      subscription = await db.Subscription.create({
        organization_id,
        plan_id,
        payment_id: payment.id,
        stripe_subscription_id: stripeSubscriptionId,
        billing_cycle,
        status: 'active',
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        plan: planRow?.name || '',
        start_date: periodStart,
        end_date: periodEnd,
        subscription_key: stripeSubscriptionId,
      }, { transaction: t });
    }

    // 4. Update Organization → link to active subscription
    await db.Organization.update(
      { subscription_id: subscription.id },
      { where: { id: organization_id }, transaction: t }
    );

    // 5. Create Invoice record
    const invoiceNumber = await invoiceService.generateInvoiceNumber(organization_id, t);

    await db.Invoice.create({
      organization_id,
      subscription_id: subscription.id,
      payment_id: payment.id,
      stripe_invoice_id: stripeInvoiceId,
      invoice_number: invoiceNumber,
      amount: amount_paid,
      currency,
      status: 'paid',
      hosted_invoice_url: hosted_invoice_url || null,
      invoice_pdf_url: invoice_pdf || null,
      issued_at: new Date(),
      paid_at: new Date(),
    }, { transaction: t });

    // 6. Commit
    await t.commit();

    console.log(`[subscription.service] ✅ Subscription activated for org ${organization_id}`);
    return { success: true, subscription_id: subscription.id, payment_id: payment.id };

  } catch (error) {
    await t.rollback();
    console.error('[subscription.service] ❌ activateFromWebhook rolled back:', error.message);
    throw error;
  }
};

// ─── Sync Subscription Update ─────────────────────────────────────────────────

exports.syncSubscriptionUpdate = async (stripeSubscription) => {
  const subscription = await db.Subscription.findOne({
    where: { stripe_subscription_id: stripeSubscription.id },
  });

  if (!subscription) {
    console.warn(`[subscription.service] Subscription not found for ${stripeSubscription.id}`);
    return;
  }

  await subscription.update({
    status: stripeSubscription.status,
    cancel_at_period_end: stripeSubscription.cancel_at_period_end,
    canceled_at: stripeSubscription.canceled_at
      ? new Date(stripeSubscription.canceled_at * 1000)
      : null,
    current_period_start: new Date(stripeSubscription.current_period_start * 1000),
    current_period_end: new Date(stripeSubscription.current_period_end * 1000),
  });
};

// ─── Handle Subscription Canceled ────────────────────────────────────────────

exports.handleSubscriptionCanceled = async (stripeSubscription) => {
  const subscription = await db.Subscription.findOne({
    where: { stripe_subscription_id: stripeSubscription.id },
  });

  if (!subscription) {
    console.warn(`[subscription.service] Subscription not found for cancel: ${stripeSubscription.id}`);
    return;
  }

  await subscription.update({
    status: 'canceled',
    canceled_at: new Date(),
    cancel_at_period_end: false,
  });
};

// ─── Handle Payment Failed ────────────────────────────────────────────────────

exports.handlePaymentFailed = async (stripeInvoice) => {
  const payment = await db.Payment.findOne({
    where: { idempotency_key: stripeInvoice.id },
  });

  if (payment) {
    await payment.update({ status: 'failed', metadata: stripeInvoice });
  }

  if (stripeInvoice.subscription) {
    await db.Subscription.update(
      { status: 'past_due' },
      { where: { stripe_subscription_id: stripeInvoice.subscription } }
    );
  }
};

// ─── Cancel (org-initiated) ───────────────────────────────────────────────────

exports.cancelSubscription = async (organization_id, atPeriodEnd = true) => {
  const subscription = await db.Subscription.findOne({
    where: { organization_id, status: 'active' },
  });

  if (!subscription) throw new Error('No active subscription found');
  if (!subscription.stripe_subscription_id) throw new Error('No Stripe subscription linked');

  await stripeService.cancelSubscription(subscription.stripe_subscription_id, atPeriodEnd);

  await subscription.update({
    cancel_at_period_end: atPeriodEnd,
    canceled_at: atPeriodEnd ? null : new Date(),
    status: atPeriodEnd ? 'active' : 'canceled',
  });

  return subscription;
};

// ─── Change Plan ──────────────────────────────────────────────────────────────

exports.changePlan = async ({ organization_id, new_plan_id, billing_cycle }) => {
  const subscription = await db.Subscription.findOne({
    where: { organization_id, status: 'active' },
  });

  if (!subscription) throw new Error('No active subscription found');

  const newPlan = await db.Plan.findOne({ where: { id: new_plan_id, is_active: true } });
  if (!newPlan) throw new Error('Target plan not found or inactive');

  const newStripePriceId = billing_cycle === 'yearly'
    ? newPlan.stripe_price_yearly_id
    : newPlan.stripe_price_monthly_id;

  if (!newStripePriceId) throw new Error(`No Stripe price for plan "${newPlan.name}" on ${billing_cycle} cycle`);

  await stripeService.updateSubscriptionPlan(subscription.stripe_subscription_id, newStripePriceId);

  await subscription.update({ plan_id: new_plan_id, billing_cycle, plan: newPlan.name });

  return subscription;
};

// ─── Current Subscription ─────────────────────────────────────────────────────

exports.getCurrentSubscription = async (organization_id) => {
  return db.Subscription.findOne({
    where: { organization_id },
    order: [['createdAt', 'DESC']],
    include: [{ model: db.Plan, as: 'planDetails' }],
  });
};
