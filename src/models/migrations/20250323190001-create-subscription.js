"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Subscriptions", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      organization_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: "Organizations", key: "id" },
        onDelete: "CASCADE"
      },
      subscription_key: { type: Sequelize.STRING, unique: true, allowNull: false },
      plan: { type: Sequelize.STRING, allowNull: false },
      start_date: { type: Sequelize.DATE, allowNull: false },
      end_date: { type: Sequelize.DATE, allowNull: true },
      status: { type: Sequelize.STRING, defaultValue: "active" },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Subscriptions");
  }
};
