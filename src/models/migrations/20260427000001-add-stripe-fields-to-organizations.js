'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Organizations', 'stripe_customer_id', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });

    await queryInterface.addColumn('Organizations', 'billing_email', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Organizations', 'billing_name', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Organizations', 'stripe_customer_id');
    await queryInterface.removeColumn('Organizations', 'billing_email');
    await queryInterface.removeColumn('Organizations', 'billing_name');
  },
};
