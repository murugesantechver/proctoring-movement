'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Sessions', 'course_id', {
      type: Sequelize.INTEGER,
      allowNull: true, 
      references: {
        model: 'Courses',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', 
    });
  },

  async down (queryInterface, Sequelize) {
   await queryInterface.removeColumn('Sessions', 'course_id');
  }
};
