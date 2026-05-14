/**
 * invoice.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Invoice number generation and invoice helpers.
 * Invoice numbers are sequential per organization: INV-{ORG_ID}-{YEAR}-{SEQUENCE}
 * e.g. INV-3-2026-0001, INV-3-2026-0002
 * ─────────────────────────────────────────────────────────────────────────────
 */

const db = require('../../models/models');
const { Op } = require('sequelize');

/**
 * Generate a unique sequential invoice number for an org.
 * Must be called inside an existing transaction to prevent race conditions.
 *
 * @param {number} organization_id
 * @param {object} transaction   - Sequelize transaction (required — caller must own it)
 * @returns {string}             - e.g. "INV-3-2026-0001"
 */
exports.generateInvoiceNumber = async (organization_id, transaction) => {
  const year = new Date().getFullYear();
  const prefix = `INV-${organization_id}-${year}-`;

  // Count how many invoices this org has in the current year
  const count = await db.Invoice.count({
    where: {
      organization_id,
      invoice_number: { [Op.like]: `${prefix}%` },
    },
    transaction,
  });

  // Zero-pad the sequence to 4 digits: 0001, 0002 … 9999
  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}${sequence}`;
};

/**
 * Get all invoices for an organization, newest first.
 */
exports.getOrgInvoices = async (organization_id) => {
  return db.Invoice.findAll({
    where: { organization_id },
    order: [['createdAt', 'DESC']],
    include: [
      { model: db.Subscription, as: 'subscription', attributes: ['id', 'billing_cycle', 'status'] },
      { model: db.Payment, as: 'payment', attributes: ['id', 'amount', 'currency', 'billing_cycle', 'status'] },
    ],
  });
};
