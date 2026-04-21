'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.renameColumn('ProctoringKeys', 'key_value', 'key_id');

  },

  async down (queryInterface, Sequelize) {
    await queryInterface.renameColumn('ProctoringKeys', 'key_id', 'key_value');
  }
};
