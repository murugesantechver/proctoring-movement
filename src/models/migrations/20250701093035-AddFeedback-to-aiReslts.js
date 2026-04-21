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
    // await queryInterface.addColumn('AIResults', 'feedback_text', {
    //   type: Sequelize.TEXT,
    //   allowNull: true,
    // });
    // await queryInterface.addColumn('AIResults', 'feedback_rating', {
    //   type: Sequelize.INTEGER,
    //   allowNull: true,
    // });
    // await queryInterface.addColumn('AIResults', 'thumbs_up', {
    //   type: Sequelize.BOOLEAN,
    //   allowNull: true,
    // });
    // await queryInterface.addColumn('AIResults', 'thumbs_down', {
    //   type: Sequelize.BOOLEAN,
    //   allowNull: true,
    // });
    // await queryInterface.addColumn('AIResults', 'resolved', {
    //   type: Sequelize.BOOLEAN,
    //   allowNull: false,
    //   defaultValue: false,
    // });
    // await queryInterface.addColumn('AIResults', 'resolved_comment', {
    //   type: Sequelize.TEXT,
    //   allowNull: true,
    // });
    await queryInterface.addColumn('AIResults', 'feedback_added_time', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('AIResults', 'feedback_updated_time', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('AIResults', 'resolved_time', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('AIResults', 'resolved_updated_time', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('AIResults', 'feedback_added_user', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('AIResults', 'resolved_user', {
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
  }
};
