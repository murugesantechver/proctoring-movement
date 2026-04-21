"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "AdminSettings",
      [
        {
          id: 1,
          orgId: 1,
          settings: JSON.stringify({
            theme: "light",
            notifications: true,
            max_sessions_per_key: 100,
          }),
          lastUpdatedBy: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("AdminSettings", { id: [1] }, {});
  },
};
