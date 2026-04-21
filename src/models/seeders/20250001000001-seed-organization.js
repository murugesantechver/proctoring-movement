"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "Organizations",
      [
        {
          id: 1,
          name: "BIS Safety Software",
          industry: "Education",
          subscription_id: null,
          contact_email: "admin@bissafety.com",
          contact_phone: "+1-800-000-0001",
          notification_emails: "{notify@bissafety.com}",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: "Test Organization",
          industry: "Technology",
          subscription_id: null,
          contact_email: "admin@testorg.com",
          contact_phone: "+1-800-000-0002",
          notification_emails: "{notify@testorg.com}",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Organizations", { id: [1, 2] }, {});
  },
};
