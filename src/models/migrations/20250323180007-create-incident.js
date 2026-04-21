"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Incidents", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      session_id: { 
        type: Sequelize.UUID, 
        allowNull: false, 
        references: { model: "Sessions", key: "id" },
        onDelete: "CASCADE"
      },
      violation_type: { type: Sequelize.INTEGER, allowNull: false },
      recording_id: { type: Sequelize.INTEGER, allowNull: true },
      status: { type: Sequelize.STRING, defaultValue: "pending" },
      incident_time: { type: Sequelize.DATE, allowNull: false },
      reviewed_by: { type: Sequelize.INTEGER, allowNull: true },
      review_notes: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Incidents");
  }
};
