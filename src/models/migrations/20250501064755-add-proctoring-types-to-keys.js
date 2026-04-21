'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('ProctoringKeys', 'proctoring_type_ids', {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      allowNull: false,
      defaultValue: [],
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('ProctoringKeys', 'proctoring_type_ids');
  }
};
