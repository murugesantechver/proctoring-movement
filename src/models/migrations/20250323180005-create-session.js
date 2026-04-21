"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Sessions", {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      key_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: "ProctoringKeys", key: "id" },
        onDelete: "CASCADE"
      },
      user_id: { 
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
      verification_status: { 
        type: Sequelize.ENUM("pending", "approved", "rejected"), 
        defaultValue: "pending" 
      },
      override_reason: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Sessions");
  }
};
