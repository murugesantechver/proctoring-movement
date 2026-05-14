const db = require('../../models/models');
const stripeService = require('../../shared/services/stripe.service');

// ─── List Plans (public — React pricing page) ─────────────────────────────────

exports.listPlans = async (req, res) => {
  try {
    const where = { is_active: true, is_public: true };
    const plans = await db.Plan.findAll({ where, order: [['monthly_amount', 'ASC']] });
    return res.status(200).json({ success: true, data: plans });
  } catch (error) {
    console.error('[plan.controller] listPlans error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Get single plan ──────────────────────────────────────────────────────────

exports.getPlan = async (req, res) => {
  try {
    const { plan_id } = req.params;
    const plan = await db.Plan.findByPk(plan_id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    return res.status(200).json({ success: true, data: plan });
  } catch (error) {
    console.error('[plan.controller] getPlan error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Create Plan (techv_admin only) ──────────────────────────────────────────
// Creates the Plan in Stripe first, then saves to DB with the Stripe IDs.

exports.createPlan = async (req, res) => {
  try {
    const {
      name, description,
      monthly_amount, yearly_amount, currency = 'usd',
      max_keys, max_sessions, max_participants,
      features = [], is_public = true,
    } = req.body;

    if (!name || !monthly_amount || !yearly_amount) {
      return res.status(400).json({ success: false, message: 'name, monthly_amount, yearly_amount are required' });
    }

    // 1. Create Stripe Product
    const stripeProduct = await stripeService.createProduct({ name, description: description || name });

    // 2. Create monthly + yearly Stripe Prices
    const [monthlyPrice, yearlyPrice] = await Promise.all([
      stripeService.createPrice({ stripeProductId: stripeProduct.id, unitAmount: monthly_amount, currency, interval: 'month' }),
      stripeService.createPrice({ stripeProductId: stripeProduct.id, unitAmount: yearly_amount, currency, interval: 'year' }),
    ]);

    // 3. Save plan to DB
    const plan = await db.Plan.create({
      name, description,
      stripe_product_id: stripeProduct.id,
      stripe_price_monthly_id: monthlyPrice.id,
      stripe_price_yearly_id: yearlyPrice.id,
      monthly_amount, yearly_amount, currency,
      max_keys: max_keys || 10,
      max_sessions: max_sessions || 500,
      max_participants: max_participants || 100,
      features,
      is_active: true,
      is_public,
    });

    return res.status(201).json({ success: true, data: plan });
  } catch (error) {
    console.error('[plan.controller] createPlan error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// ─── Update Plan (techv_admin only) ──────────────────────────────────────────

exports.updatePlan = async (req, res) => {
  try {
    const { plan_id } = req.params;
    const { name, description, max_keys, max_sessions, max_participants, features, is_active, is_public } = req.body;

    const plan = await db.Plan.findByPk(plan_id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    await plan.update({ name, description, max_keys, max_sessions, max_participants, features, is_active, is_public });

    return res.status(200).json({ success: true, data: plan });
  } catch (error) {
    console.error('[plan.controller] updatePlan error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Deactivate Plan (techv_admin only) ───────────────────────────────────────

exports.deactivatePlan = async (req, res) => {
  try {
    const { plan_id } = req.params;
    const plan = await db.Plan.findByPk(plan_id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    // Archive on Stripe
    if (plan.stripe_price_monthly_id) await stripeService.deactivatePrice(plan.stripe_price_monthly_id);
    if (plan.stripe_price_yearly_id) await stripeService.deactivatePrice(plan.stripe_price_yearly_id);
    if (plan.stripe_product_id) await stripeService.deactivateProduct(plan.stripe_product_id);

    await plan.update({ is_active: false });

    return res.status(200).json({ success: true, message: 'Plan deactivated' });
  } catch (error) {
    console.error('[plan.controller] deactivatePlan error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
