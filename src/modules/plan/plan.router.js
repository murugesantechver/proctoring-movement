const express = require('express');
const router = express.Router();
const planController = require('./plan.controller');
const authenticate = require('../../shared/middlewares/auth.middleware');

// Public — React pricing page reads this
router.get('/', planController.listPlans);
router.get('/:plan_id', planController.getPlan);

// techv_admin only routes — auth middleware checks role
router.post('/', authenticate, planController.createPlan);
router.put('/:plan_id', authenticate, planController.updatePlan);
router.delete('/:plan_id', authenticate, planController.deactivatePlan);

module.exports = router;
