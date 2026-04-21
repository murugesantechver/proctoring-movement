'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Sessions', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: false, 
      defaultValue: 2,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', 
    });
  },

  async down (queryInterface, Sequelize) {
     await queryInterface.removeColumn('Sessions', 'user_id');
  
  }
};
