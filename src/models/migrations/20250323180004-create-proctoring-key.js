"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ProctoringKeys", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      organization_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: "Organizations", key: "id" },
        onDelete: "CASCADE"
      },
      key_value: { type: Sequelize.STRING, allowNull: false, unique: true },
      created_by: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE"
      },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      revoked: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("ProctoringKeys");
  }
};
