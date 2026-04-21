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
    await queryInterface.changeColumn('AIResults', 'frame_image', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.changeColumn('AIResults', 'user_image', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.changeColumn('AIResults', 'frame_image', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.changeColumn('AIResults', 'user_image', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  }
};
