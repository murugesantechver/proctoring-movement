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
    
    await queryInterface.addColumn('AIResults', 'isManualVerificationSend', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn('AIResults', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    

  },

  async down (queryInterface, Sequelize) {

    await queryInterface.removeColumn('AIResults', 'isManualVerificationSend');
    await queryInterface.removeColumn('AIResults', 'user_id');

    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
