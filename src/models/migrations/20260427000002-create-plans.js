'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Plans', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },

      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },

      // Stripe IDs (created in Stripe dashboard or via API)
      stripe_product_id: { type: Sequelize.STRING, allowNull: true, unique: true },
      stripe_price_monthly_id: { type: Sequelize.STRING, allowNull: true, unique: true },
      stripe_price_yearly_id: { type: Sequelize.STRING, allowNull: true, unique: true },

      // Pricing stored in cents to avoid float issues (e.g. 4999 = $49.99)
      monthly_amount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      yearly_amount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      currency: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'usd' },

      // Usage limits per plan
      max_keys: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 10 },
      max_sessions: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 500 },
      max_participants: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 100 },

      // Feature flags as JSON array e.g. ["screen_monitoring","face_match"]
      features: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },

      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      // false = hidden from self-serve (enterprise/custom plans)
      is_public: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },

      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Plans');
  },
};
