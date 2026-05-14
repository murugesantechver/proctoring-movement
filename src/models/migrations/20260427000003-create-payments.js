'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Payments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },

      organization_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Organizations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },

      plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Plans', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },

      // Stripe references
      stripe_customer_id: { type: Sequelize.STRING, allowNull: false },
      stripe_subscription_id: { type: Sequelize.STRING, allowNull: true },
      stripe_payment_intent_id: { type: Sequelize.STRING, allowNull: true },
      stripe_invoice_id: { type: Sequelize.STRING, allowNull: true },

      // Amount in cents (e.g. 4999 = $49.99)
      amount: { type: Sequelize.INTEGER, allowNull: false },
      currency: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'usd' },
      billing_cycle: { type: Sequelize.STRING, allowNull: false }, // 'monthly' | 'yearly'

      // Status mirrors Stripe payment states
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending',
        // values: pending | paid | failed | refunded | disputed
      },

      // Idempotency key — prevents double-processing same webhook
      // Using stripe_invoice_id as idempotency key (unique per Stripe invoice)
      idempotency_key: { type: Sequelize.STRING, allowNull: false, unique: true },

      // Full raw Stripe event payload for debugging & auditing
      metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },

      paid_at: { type: Sequelize.DATE, allowNull: true },

      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // Index for fast lookups by stripe IDs (used in webhook handler)
    await queryInterface.addIndex('Payments', ['stripe_invoice_id']);
    await queryInterface.addIndex('Payments', ['stripe_subscription_id']);
    await queryInterface.addIndex('Payments', ['organization_id']);
    await queryInterface.addIndex('Payments', ['idempotency_key']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Payments');
  },
};
