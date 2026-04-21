'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove autoIncrement from `id` column in ProctoringTypes
    await queryInterface.changeColumn('ProctoringTypes', 'id', {
      type: Sequelize.INTEGER,
      primaryKey: true,
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    // Rollback: Add autoIncrement back to `id`
    await queryInterface.changeColumn('ProctoringTypes', 'id', {
      type: Sequelize.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    });
  }
};
