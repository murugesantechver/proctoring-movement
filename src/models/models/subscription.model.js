module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define(
    'Subscription',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      organization_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Organizations', key: 'id' },
      },

      // ── Existing fields (kept as-is) ──────────────────────────────────
      subscription_key: { type: DataTypes.STRING, unique: true, allowNull: true },
      plan: { type: DataTypes.STRING, allowNull: true },
      start_date: { type: DataTypes.DATE, allowNull: true },
      end_date: { type: DataTypes.DATE, allowNull: true },

      // Status: incomplete | trialing | active | past_due | canceled | unpaid
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'incomplete' },

      // ── New Stripe payment fields ─────────────────────────────────────
      plan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'Plans', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },

      payment_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'Payments', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },

      // Stripe's subscription ID — unique per active subscription
      stripe_subscription_id: { type: DataTypes.STRING, allowNull: true, unique: true },

      billing_cycle: { type: DataTypes.STRING, allowNull: true }, // 'monthly' | 'yearly'

      // Current billing window from Stripe
      current_period_start: { type: DataTypes.DATE, allowNull: true },
      current_period_end: { type: DataTypes.DATE, allowNull: true },

      // true = will cancel at end of billing period, not immediately
      cancel_at_period_end: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      canceled_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'Subscriptions',
      timestamps: true,
    }
  );

  return Subscription;
};
