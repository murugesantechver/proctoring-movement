"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Users", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      email: { type: Sequelize.STRING, unique: true, allowNull: false },
      password: { type: Sequelize.STRING, allowNull: false },
      first_name: { type: Sequelize.STRING, allowNull: false },
      last_name: { type: Sequelize.STRING, allowNull: false },
      phone: { type: Sequelize.STRING, allowNull: true },
      role: { 
        type: Sequelize.ENUM("techv_admin", "client_admin", "participant"), 
        allowNull: false 
      },
      organization_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: "Organizations", key: "id" },
        onDelete: "CASCADE"
      },
      status: { type: Sequelize.STRING, defaultValue: "active" },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Users");
  }
};
