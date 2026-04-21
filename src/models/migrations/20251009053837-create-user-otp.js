"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("UserOtps", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },

      otp: { type: Sequelize.STRING, allowNull: false },

      expiresAt: { type: Sequelize.DATE, allowNull: false },

      verified: { type: Sequelize.BOOLEAN, defaultValue: false },

      createdAt: { 
        type: Sequelize.DATE, 
        allowNull: false, 
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") 
      },

      updatedAt: { 
        type: Sequelize.DATE, 
        allowNull: false, 
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") 
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("UserOtps");
  },
};
