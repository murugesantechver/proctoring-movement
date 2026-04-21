'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
   await queryInterface.createTable('ProctoringNotes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      key_id: {
        type: Sequelize.STRING,
        allowNull: true,
        references: {
          model: 'ProctoringKeys',
          key: 'key_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      session_id: {
        type: Sequelize.STRING,
        allowNull: true,
        references: {
          model: 'Sessions',
          key: 'external_session_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      source: {
        type: Sequelize.ENUM('key_details', 'participant_view', 'main_admin'),
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down (queryInterface, Sequelize) {
     await queryInterface.dropTable('ProctoringNotes');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_ProctoringNotes_source";');
  }
};
