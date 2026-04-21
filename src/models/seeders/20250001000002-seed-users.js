"use strict";

const bcrypt = require("bcryptjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hash = (pwd) => bcrypt.hashSync(pwd, 10);

    await queryInterface.bulkInsert(
      "Users",
      [
        // ── TechV Super Admin ─────────────────────────────────────────────
        {
          id: 1,
          email: "superadmin@techversant.com",
          password: hash("Admin@1234"),
          first_name: "Tech",
          last_name: "Admin",
          phone: "+1-800-000-0010",
          role: "techv_admin",
          organization_id: 1,
          status: "active",
          user_name: "techv_admin",
          last_login_at: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },

        // ── Client Admin — Org 1 (BIS Safety) ────────────────────────────
        {
          id: 2,
          email: "clientadmin@bissafety.com",
          password: hash("Admin@1234"),
          first_name: "Client",
          last_name: "Admin",
          phone: "+1-800-000-0011",
          role: "client_admin",
          organization_id: 1,
          status: "active",
          user_name: "bis_admin",
          last_login_at: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },

        // ── Client Admin — Org 2 (Test Org) ──────────────────────────────
        {
          id: 3,
          email: "clientadmin@testorg.com",
          password: hash("Admin@1234"),
          first_name: "Test",
          last_name: "Admin",
          phone: "+1-800-000-0012",
          role: "client_admin",
          organization_id: 2,
          status: "active",
          user_name: "test_admin",
          last_login_at: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },

        // ── Participant (used as WS test user) ────────────────────────────
        {
          id: 100,
          email: "participant@testorg.com",
          password: hash("Test@1234"),
          first_name: "John",
          last_name: "Doe",
          phone: "+1-800-000-0099",
          role: "participant",
          organization_id: 1,
          status: "active",
          user_name: "johndoe",
          last_login_at: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Users", { id: [1, 2, 3, 100] }, {});
  },
};
