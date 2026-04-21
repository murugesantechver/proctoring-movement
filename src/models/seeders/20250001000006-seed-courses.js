"use strict";

/**
 * Seed a dev course so WS start-session can reference course_id: 101
 * without hitting a FK constraint.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "Courses",
      [
        {
          id: 101,
          name: "Safety Course — Dev",
          description: "Seed course for local WebSocket testing",
          organization_id: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 102,
          name: "Test Course — Org 2",
          description: "Seed course for Test Organization",
          organization_id: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Courses", { id: [101, 102] }, {});
  },
};
