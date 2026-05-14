const db = require('../../models/models');
const subscriptionService = require('../../shared/services/subscription.service');
const stripeService = require('../../shared/services/stripe.service');
const invoiceService = require('../../shared/services/invoice.service');

// ─── Create Checkout (org admin initiates payment) ────────────────────────────
// Frontend calls this first. Returns client_secret for Stripe.js to confirm payment.

exports.createCheckout = async (req, res) => {
  try {
    const { plan_id, billing_cycle , organization_id} = req.body;
    // const organization_id = req.user.organization_id;

    if (!plan_id || !billing_cycle) {
      return res.status(400).json({ success: false, message: 'plan_id and billing_cycle are required' });
    }
    if (!['monthly', 'yearly'].includes(billing_cycle)) {
      return res.status(400).json({ success: false, message: 'billing_cycle must be monthly or yearly' });
    }

    const result = await subscriptionService.createCheckout({ organization_id, plan_id, billing_cycle });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[payment.controller] createCheckout error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// ─── Payment History (org admin) ──────────────────────────────────────────────

exports.getPaymentHistory = async (req, res) => {
  try {
    const organization_id = req.user.organization_id;

    const payments = await db.Payment.findAll({
      where: { organization_id },
      order: [['createdAt', 'DESC']],
      include: [{ model: db.Plan, as: 'plan', attributes: ['id', 'name', 'currency'] }],
    });

    return res.status(200).json({ success: true, data: payments });
  } catch (error) {
    console.error('[payment.controller] getPaymentHistory error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Single Payment Detail ────────────────────────────────────────────────────

exports.getPayment = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const organization_id = req.user.organization_id;

    const payment = await db.Payment.findOne({
      where: { id: payment_id, organization_id },
      include: [
        { model: db.Plan, as: 'plan' },
        { model: db.Invoice, as: 'invoices' },
      ],
    });

    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    return res.status(200).json({ success: true, data: payment });
  } catch (error) {
    console.error('[payment.controller] getPayment error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Invoice List (org admin) ─────────────────────────────────────────────────

exports.getInvoices = async (req, res) => {
  try {
    const organization_id = req.user.organization_id;
    const invoices = await invoiceService.getOrgInvoices(organization_id);
    return res.status(200).json({ success: true, data: invoices });
  } catch (error) {
    console.error('[payment.controller] getInvoices error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Billing Portal (redirect to Stripe-hosted portal) ───────────────────────

exports.getBillingPortal = async (req, res) => {
  try {
    const organization_id = req.user.organization_id;
    const organization = await db.Organization.findByPk(organization_id);

    if (!organization) return res.status(404).json({ success: false, message: 'Organization not found' });
    if (!organization.stripe_customer_id) {
      return res.status(400).json({ success: false, message: 'No billing account found. Please subscribe to a plan first.' });
    }

    const returnUrl = process.env.BILLING_PORTAL_RETURN_URL || process.env.WEB_URL || 'https://yourdomain.com/billing';
    const session = await stripeService.createBillingPortalSession(organization.stripe_customer_id, returnUrl);

    return res.status(200).json({ success: true, data: { url: session.url } });
  } catch (error) {
    console.error('[payment.controller] getBillingPortal error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Current Subscription ─────────────────────────────────────────────────────

exports.getCurrentSubscription = async (req, res) => {
  try {
    const organization_id = req.user.organization_id;
    const subscription = await subscriptionService.getCurrentSubscription(organization_id);

    if (!subscription) {
      return res.status(200).json({ success: true, data: null, message: 'No active subscription' });
    }

    return res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    console.error('[payment.controller] getCurrentSubscription error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Cancel Subscription ──────────────────────────────────────────────────────

exports.cancelSubscription = async (req, res) => {
  try {
    const organization_id = req.user.organization_id;
    // Default: cancel at period end (org keeps access until billing period ends)
    const { immediately = false } = req.body;

    const subscription = await subscriptionService.cancelSubscription(organization_id, !immediately);

    return res.status(200).json({
      success: true,
      message: immediately
        ? 'Subscription canceled immediately'
        : 'Subscription will cancel at end of billing period',
      data: subscription,
    });
  } catch (error) {
    console.error('[payment.controller] cancelSubscription error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// ─── Change Plan (upgrade / downgrade) ───────────────────────────────────────

exports.changePlan = async (req, res) => {
  try {
    const { new_plan_id, billing_cycle } = req.body;
    const organization_id = req.user.organization_id;

    if (!new_plan_id || !billing_cycle) {
      return res.status(400).json({ success: false, message: 'new_plan_id and billing_cycle are required' });
    }

    const subscription = await subscriptionService.changePlan({ organization_id, new_plan_id, billing_cycle });

    return res.status(200).json({ success: true, message: 'Plan updated', data: subscription });
  } catch (error) {
    console.error('[payment.controller] changePlan error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// ─── Admin: All payments across all orgs (techv_admin only) ──────────────────

exports.getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    const where = status ? { status } : {};

    const { count, rows } = await db.Payment.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        { model: db.Plan, as: 'plan', attributes: ['id', 'name'] },
        { model: db.Organization, as: 'organization', attributes: ['id', 'name', 'contact_email'] },
      ],
    });

    return res.status(200).json({ success: true, total: count, page: parseInt(page), data: rows });
  } catch (error) {
    console.error('[payment.controller] getAllPayments error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
