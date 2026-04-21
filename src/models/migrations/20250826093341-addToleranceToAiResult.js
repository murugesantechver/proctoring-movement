'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('AIResults', 'active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn('AIResults', 'AttemptCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    });
    await queryInterface.addColumn('AIResults', 'finalResult', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn('ProctoringKeys', 'proctoring_tolerance', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: []
    });
    
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('ProctoringKeys', 'proctoring_tolerance');
    await queryInterface.removeColumn('AIResults', 'active');
    await queryInterface.removeColumn('AIResults', 'AttemptCount');
    await queryInterface.removeColumn('AIResults', 'finalResult');

  }
};
