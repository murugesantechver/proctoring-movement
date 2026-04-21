'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('ProctoringNotes', 'organization_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // must be nullable initially
      references: {
        model: 'Organizations',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.sequelize.query(`
      UPDATE "ProctoringNotes"
      SET "organization_id" = 2
    `);

    await queryInterface.changeColumn('ProctoringNotes', 'organization_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Organizations',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('ProctoringNotes', 'organization_id');

  }
};
