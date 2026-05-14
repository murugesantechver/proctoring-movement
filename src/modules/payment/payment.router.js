const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const authenticate = require('../../shared/middlewares/auth.middleware');

// ── Org admin routes (client_admin scoped) ────────────────────────────────────
router.post('/create-checkout',       /*authenticate,*/ paymentController.createCheckout);
router.get('/history',                /*authenticate,*/ paymentController.getPaymentHistory);
router.get('/invoices',               /*authenticate,*/ paymentController.getInvoices);
router.get('/billing-portal',         /*authenticate,*/ paymentController.getBillingPortal);
router.get('/subscription/current',   /*authenticate,*/ paymentController.getCurrentSubscription);
router.post('/subscription/cancel',   /*authenticate,*/ paymentController.cancelSubscription);
router.post('/subscription/change-plan', /*authenticate,*/ paymentController.changePlan);
router.get('/:payment_id',            /*authenticate,*/ paymentController.getPayment);

// ── techv_admin route ─────────────────────────────────────────────────────────
router.get('/', /*authenticate,*/ paymentController.getAllPayments);

module.exports = router;
