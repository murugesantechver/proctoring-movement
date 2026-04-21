'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("Sessions", "external_session_id", {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
  },

  async down (queryInterface, Sequelize) {
   await queryInterface.removeColumn("Sessions", "external_session_id"); 
  }
};
