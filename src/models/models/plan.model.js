module.exports = (sequelize, DataTypes) => {
  const Plan = sequelize.define(
    'Plan',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },

      // Stripe IDs
      stripe_product_id: { type: DataTypes.STRING, allowNull: true, unique: true },
      stripe_price_monthly_id: { type: DataTypes.STRING, allowNull: true, unique: true },
      stripe_price_yearly_id: { type: DataTypes.STRING, allowNull: true, unique: true },

      // Pricing in cents (e.g. 4999 = $49.99)
      monthly_amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      yearly_amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'usd' },

      // Limits
      max_keys: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
      max_sessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 500 },
      max_participants: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },

      // Feature list e.g. ["face_match","screen_monitoring"]
      features: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },

      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      is_public: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'Plans',
      timestamps: true,
    }
  );

  return Plan;
};
