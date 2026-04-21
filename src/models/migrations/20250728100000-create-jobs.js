'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Jobs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      job_type: { type: Sequelize.STRING, allowNull: false },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'pending' },
      payload: { type: Sequelize.JSONB, allowNull: true },
      response_data: { type: Sequelize.JSONB, allowNull: true },
      log: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      error: { type: Sequelize.JSONB, allowNull: true },
      triggeredUser: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      retry_flag: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      retry_status: { type: Sequelize.STRING, allowNull: true },
      retry_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Jobs');
  },
}; 