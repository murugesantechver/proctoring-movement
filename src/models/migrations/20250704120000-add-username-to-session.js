'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Sessions', 'user_name', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('CourseAssignments', 'user_name', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Users', 'user_name', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Sessions', 'user_name');
    await queryInterface.removeColumn('CourseAssignments', 'user_name');
    await queryInterface.removeColumn('Users', 'user_name');

  }
}; 