module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define(
    'Invoice',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      organization_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Organizations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },

      subscription_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'Subscriptions', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },

      payment_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'Payments', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },

      // Stripe invoice ID (source of truth)
      stripe_invoice_id: { type: DataTypes.STRING, allowNull: false, unique: true },

      // Your own sequential number e.g. INV-2026-0001
      invoice_number: { type: DataTypes.STRING, allowNull: false, unique: true },

      // Amount in cents
      amount: { type: DataTypes.INTEGER, allowNull: false },
      currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'usd' },

      // Status: draft | open | paid | void | uncollectible
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'open' },

      // Stripe-hosted PDF links
      hosted_invoice_url: { type: DataTypes.TEXT, allowNull: true },
      invoice_pdf_url: { type: DataTypes.TEXT, allowNull: true },

      issued_at: { type: DataTypes.DATE, allowNull: true },
      due_at: { type: DataTypes.DATE, allowNull: true },
      paid_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'Invoices',
      timestamps: true,
    }
  );

  return Invoice;
};
