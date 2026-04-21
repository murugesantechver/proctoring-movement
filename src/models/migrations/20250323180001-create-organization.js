"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Organizations", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      industry: { type: Sequelize.STRING, allowNull: true },
      subscription_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        //references: { model: "Subscriptions", key: "id" },
        onDelete: "SET NULL"
      },
      contact_email: { type: Sequelize.STRING, allowNull: false, unique: true },
      contact_phone: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Organizations");
  }
};
