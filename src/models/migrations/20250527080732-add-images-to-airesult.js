'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('AIResults', 'request_id', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('AIResults', 'frame_image', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('AIResults', 'user_image', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
   await queryInterface.removeColumn('AIResults', 'request_id');
   await queryInterface.removeColumn('AIResults', 'frame_image');
   await queryInterface.removeColumn('AIResults', 'user_image');
  }
};
