'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
        await queryInterface.removeConstraint('Sessions', 'Sessions_key_id_fkey');
      } catch (error) {
        console.warn('Constraint does not exist or already removed. Skipping.');
    }

    // 2. Alter the key_id column type in Sessions to STRING
    await queryInterface.changeColumn('Sessions', 'key_id', {
      type: Sequelize.STRING,
      allowNull: true, // adjust if needed
    });

    // 3. Add the new foreign key constraint referencing ProctoringKeys.key_id
    await queryInterface.addConstraint('Sessions', {
      fields: ['key_id'],
      type: 'foreign key',
      name: 'Sessions_key_id_fkey',
      references: {
        table: 'ProctoringKeys',
        field: 'key_id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  async down (queryInterface, Sequelize) {
    // 1. Remove new foreign key
    await queryInterface.removeConstraint('Sessions', 'Sessions_key_id_fkey');

    // 2. Change the column back to INTEGER (adjust size if needed)
    await queryInterface.changeColumn('Sessions', 'key_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // 3. Add back the old foreign key referencing ProctoringKeys.id
    await queryInterface.addConstraint('Sessions', {
      fields: ['key_id'],
      type: 'foreign key',
      name: 'Sessions_key_id_fkey',
      references: {
        table: 'ProctoringKeys',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  }
};
