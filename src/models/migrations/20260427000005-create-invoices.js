'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Invoices', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },

      organization_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Organizations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },

      subscription_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Subscriptions', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },

      payment_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Payments', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },

      // Stripe invoice ID (source of truth from Stripe)
      stripe_invoice_id: { type: Sequelize.STRING, allowNull: false, unique: true },

      // Your own sequential invoice number e.g. INV-2026-0001
      invoice_number: { type: Sequelize.STRING, allowNull: false, unique: true },

      // Amount in cents
      amount: { type: Sequelize.INTEGER, allowNull: false },
      currency: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'usd' },

      // Status mirrors Stripe invoice states
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'open',
        // values: draft | open | paid | void | uncollectible
      },

      // Stripe-hosted PDF links
      hosted_invoice_url: { type: Sequelize.TEXT, allowNull: true },
      invoice_pdf_url: { type: Sequelize.TEXT, allowNull: true },

      issued_at: { type: Sequelize.DATE, allowNull: true },
      due_at: { type: Sequelize.DATE, allowNull: true },
      paid_at: { type: Sequelize.DATE, allowNull: true },

      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('Invoices', ['stripe_invoice_id']);
    await queryInterface.addIndex('Invoices', ['organization_id']);
    await queryInterface.addIndex('Invoices', ['invoice_number']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Invoices');
  },
};
