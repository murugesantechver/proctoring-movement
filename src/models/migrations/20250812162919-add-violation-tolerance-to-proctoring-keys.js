'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('ProctoringKeys', 'violation_tolerance', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0 // 0 means no tolerance — any violation flags
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('ProctoringKeys', 'violation_tolerance');
  }
};
