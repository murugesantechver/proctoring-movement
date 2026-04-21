"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("AuditLogs", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      admin_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE"
      },
      organization_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: "Organizations", key: "id" },
        onDelete: "CASCADE"
      },
      action: { type: Sequelize.STRING, allowNull: false }, // e.g., "CREATE_KEY", "UPDATE_SETTINGS"
      action_type: { type: Sequelize.STRING, allowNull: false }, // e.g., "CREATE", "UPDATE", "DELETE"
      affected_entity: { type: Sequelize.STRING, allowNull: false }, // e.g., "ProctoringKey"
      description: { type: Sequelize.TEXT, allowNull: true },
      timestamp: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("AuditLogs");
  }
};
