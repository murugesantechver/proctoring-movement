module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    'Payment',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      organization_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Organizations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },

      plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Plans', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },

      // Stripe references
      stripe_customer_id: { type: DataTypes.STRING, allowNull: false },
      stripe_subscription_id: { type: DataTypes.STRING, allowNull: true },
      stripe_payment_intent_id: { type: DataTypes.STRING, allowNull: true },
      stripe_invoice_id: { type: DataTypes.STRING, allowNull: true },

      // Amount in cents
      amount: { type: DataTypes.INTEGER, allowNull: false },
      currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'usd' },
      billing_cycle: { type: DataTypes.STRING, allowNull: false }, // 'monthly' | 'yearly'

      // Status: pending | paid | failed | refunded | disputed
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },

      // Unique key to prevent duplicate webhook processing
      idempotency_key: { type: DataTypes.STRING, allowNull: false, unique: true },

      // Raw Stripe event payload for debugging & audit trail
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },

      paid_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'Payments',
      timestamps: true,
    }
  );

  return Payment;
};
