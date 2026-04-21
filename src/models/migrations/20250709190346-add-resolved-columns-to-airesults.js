'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
     await queryInterface.addColumn('AIResults', 'feedback_text', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('AIResults', 'feedback_rating', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('AIResults', 'thumbs_up', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    });

    await queryInterface.addColumn('AIResults', 'thumbs_down', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    });

    await queryInterface.addColumn('AIResults', 'resolved', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('AIResults', 'resolved_comment', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('AIResults', 'feedback_text');
    await queryInterface.removeColumn('AIResults', 'feedback_rating');
    await queryInterface.removeColumn('AIResults', 'thumbs_up');
    await queryInterface.removeColumn('AIResults', 'thumbs_down');
    await queryInterface.removeColumn('AIResults', 'resolved');
    await queryInterface.removeColumn('AIResults', 'resolved_comment');
  }
};
