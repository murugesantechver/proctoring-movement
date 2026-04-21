'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('ProctoringKeys', 'name', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Default Key Name',      
    });
    await queryInterface.addColumn('ProctoringKeys', 'proctoring_type', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'AWS Recognition', 
    });
    await queryInterface.addColumn('ProctoringKeys', 'duration_minutes', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 120, 
    });
    await queryInterface.addColumn('ProctoringKeys', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('ProctoringKeys', 'name');
    await queryInterface.removeColumn('ProctoringKeys', 'proctoring_type');
    await queryInterface.removeColumn('ProctoringKeys', 'duration_minutes');
    await queryInterface.removeColumn('ProctoringKeys', 'description');
  }
};
