"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "PurgeCodes",
      [
        {
          id: 1,
          purge_code: "456789",
          organization_id: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          purge_code: "654321",
          organization_id: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("PurgeCodes", { id: [1, 2] }, {});
  },
};
