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
    await queryInterface.addColumn('ProctoringKeys', 'cost', {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn('ProctoringKeys', 'fee', {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn('ProctoringKeys', 'currencyType', {
      type: Sequelize.STRING,
    });
    
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('ProctoringKeys', 'cost');
    await queryInterface.removeColumn('ProctoringKeys', 'fee');
    await queryInterface.removeColumn('ProctoringKeys', 'currencyType');

  }
};
