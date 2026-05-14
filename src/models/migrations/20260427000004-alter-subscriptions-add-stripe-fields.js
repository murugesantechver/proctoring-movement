'use strict';

// This migration extends the existing Subscriptions table with
// Stripe-specific fields needed for payment-backed subscriptions.
// We keep your existing columns (subscription_key, plan, start_date, end_date, status)
// and add the new Stripe + billing columns alongside them.

module.exports = {
  async up(queryInterface, Sequelize) {
    // Link to our new Plans table
    await queryInterface.addColumn('Subscriptions', 'plan_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Plans', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    // Link to the Payment that activated this subscription
    await queryInterface.addColumn('Subscriptions', 'payment_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Payments', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    // Stripe subscription ID (unique per active subscription)
    await queryInterface.addColumn('Subscriptions', 'stripe_subscription_id', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });

    // Billing cycle for this subscription
    await queryInterface.addColumn('Subscriptions', 'billing_cycle', {
      type: Sequelize.STRING, // 'monthly' | 'yearly'
      allowNull: true,
    });

    // Current billing period (from Stripe)
    await queryInterface.addColumn('Subscriptions', 'current_period_start', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('Subscriptions', 'current_period_end', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // true = subscription will cancel at end of current period (not immediately)
    await queryInterface.addColumn('Subscriptions', 'cancel_at_period_end', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('Subscriptions', 'canceled_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Index for fast webhook lookups by stripe_subscription_id
    await queryInterface.addIndex('Subscriptions', ['stripe_subscription_id']);
    await queryInterface.addIndex('Subscriptions', ['organization_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Subscriptions', 'plan_id');
    await queryInterface.removeColumn('Subscriptions', 'payment_id');
    await queryInterface.removeColumn('Subscriptions', 'stripe_subscription_id');
    await queryInterface.removeColumn('Subscriptions', 'billing_cycle');
    await queryInterface.removeColumn('Subscriptions', 'current_period_start');
    await queryInterface.removeColumn('Subscriptions', 'current_period_end');
    await queryInterface.removeColumn('Subscriptions', 'cancel_at_period_end');
    await queryInterface.removeColumn('Subscriptions', 'canceled_at');
  },
};
