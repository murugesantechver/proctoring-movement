'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE "AIResults" SET "id_status" = 'invalid' WHERE "id_status" IS NULL
    `);
    
    await queryInterface.changeColumn('AIResults', 'id_status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'invalid',
    });
    await queryInterface.addColumn('AIResults', 'override_reason', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('AIResults', 'id_status', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.removeColumn('AIResults', 'override_reason');
  }
}; 