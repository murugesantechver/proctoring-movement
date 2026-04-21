"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("AdminSettings", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      orgId: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: "Organizations", key: "id" },
        onDelete: "CASCADE"
      },
      settings: { type: Sequelize.JSONB, allowNull: false },
      lastUpdatedBy: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: "Users", key: "id" },
        onDelete: "SET NULL"
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("AdminSettings");
  }
};
