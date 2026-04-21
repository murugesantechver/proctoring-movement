'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
     await queryInterface.changeColumn('Organizations', 'subscription_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Subscriptions',
        key: 'id'
      },
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('Organizations', 'subscription_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Subscriptions',
        key: 'id'
      },
    });
  }
};
