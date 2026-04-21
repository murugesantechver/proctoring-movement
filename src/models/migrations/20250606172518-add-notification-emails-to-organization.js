'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Organizations', 'notification_emails', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
      defaultValue: [],
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Organizations', 'notification_emails');
}
};
