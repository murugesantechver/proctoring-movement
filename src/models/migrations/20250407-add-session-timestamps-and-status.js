"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Sessions", "started_at", {
      type: Sequelize.DATE,
      defaultValue: Sequelize.fn("NOW"),
      allowNull: false,
    });

    await queryInterface.addColumn("Sessions", "ended_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("Sessions", "status", {
      type: Sequelize.ENUM("active", "closed", "expired"),
      defaultValue: "active",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Sessions", "started_at");
    await queryInterface.removeColumn("Sessions", "ended_at");
    await queryInterface.removeColumn("Sessions", "status");

    await queryInterface.sequelize.query("DROP TYPE IF EXISTS enum_Sessions_status;");
  },
};
