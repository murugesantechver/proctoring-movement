"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Reports", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      session_id: { 
        type: Sequelize.UUID, 
        allowNull: false, 
        references: { model: "Sessions", key: "id" },
        onDelete: "CASCADE"
      },
      event_id: { type: Sequelize.INTEGER, allowNull: false },
      organization_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: "Organizations", key: "id" },
        onDelete: "CASCADE"
      },
      total_violations: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_sessions: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_users: { type: Sequelize.INTEGER, defaultValue: 0 },
      flagged_sessions: { type: Sequelize.INTEGER, defaultValue: 0 },
      report_type: { type: Sequelize.STRING, allowNull: false },
      completion_time: { type: Sequelize.TIME, allowNull: false },
      reviewer_id: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Reports");
  }
};
