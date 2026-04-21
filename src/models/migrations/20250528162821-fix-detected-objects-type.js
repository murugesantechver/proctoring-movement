'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
   await queryInterface.changeColumn('AIResults', 'detected_objects', {
      type: Sequelize.ARRAY(Sequelize.TEXT),
      allowNull: true, // or false based on your schema
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('AIResults', 'detected_objects', {
      type: Sequelize.ARRAY(Sequelize.STRING(255)),
      allowNull: true,
    }); 
  }
};
