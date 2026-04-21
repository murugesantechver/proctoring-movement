'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('AuditLogs', 'admin_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Just make it nullable, no FK constraint
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('AuditLogs', 'admin_id', {
      type: Sequelize.INTEGER,
      allowNull: false, // revert to NOT NULL
    });
  }
};
