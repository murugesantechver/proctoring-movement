"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const oneYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    // ARRAY(INTEGER) columns use Postgres literal syntax: {1,2,3}
    // JSONB columns use JSON.stringify

    const fullTolerance = JSON.stringify([
      { id: 1,  name: "Name and Photo ID Match",  ai_tool: "AWS Rekognition",    tolerance: 1 },
      { id: 2,  name: "Remain in Camera View",    ai_tool: "AWS Rekognition",    tolerance: 2 },
      { id: 3,  name: "Active Participation",     ai_tool: "AWS Rekognition",    tolerance: 2 },
      { id: 4,  name: "No Other Participants",    ai_tool: "AWS Rekognition",    tolerance: 1 },
      { id: 5,  name: "No External Resources",    ai_tool: "AWS Rekognition",    tolerance: 2 },
      { id: 6,  name: "No Electronic Devices",    ai_tool: "AWS Rekognition",    tolerance: 1 },
      { id: 7,  name: "No Headphones",            ai_tool: "AWS Rekognition",    tolerance: 2 },
      { id: 8,  name: "Single Monitor Only",      ai_tool: "AWS Rekognition",    tolerance: 1 },
      { id: 9,  name: "Screen Monitoring",        ai_tool: "AWS Rekognition",    tolerance: 1 },
      { id: 10, name: "Full View of Monitor",     ai_tool: "AWS Rekognition",    tolerance: 1 },
      { id: 11, name: "No Extended Eye Closure",  ai_tool: "AWS Rekognition",    tolerance: 3 },
    ]);

    const idOnlyTolerance = JSON.stringify([
      { id: 1, name: "Name and Photo ID Match", ai_tool: "BIS Virtual Proctor", tolerance: 1 },
    ]);

    const basicTolerance = JSON.stringify([
      { id: 1, name: "Name and Photo ID Match", ai_tool: "AWS Rekognition", tolerance: 1 },
      { id: 2, name: "Remain in Camera View",   ai_tool: "AWS Rekognition", tolerance: 2 },
    ]);

    await queryInterface.bulkInsert(
      "ProctoringKeys",
      [
        {
          id: 1,
          name: "Full Proctoring Key",
          proctoring_type: "AWS Rekognition",
          duration_minutes: 120,
          description: "All 11 proctoring rules — use for complete WS flow testing",
          organization_id: 1,
          key_id: "KEY-DEVFULL",
          // Postgres integer array literal
          proctoring_type_ids: "{1,2,3,4,5,6,7,8,9,10,11}",
          created_by: 2,
          expires_at: oneYear,
          revoked: false,
          violation_tolerance: 1,
          cost: "0",
          fee: "0",
          currencyType: "USD",
          purge_code: "456789",
          proctoring_tolerance: fullTolerance,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 2,
          name: "ID Verification Only",
          proctoring_type: "BIS Virtual Proctor",
          duration_minutes: 60,
          description: "ID check only — fastest WS test path",
          organization_id: 1,
          key_id: "KEY-DEVID01",
          proctoring_type_ids: "{1}",
          created_by: 2,
          expires_at: oneYear,
          revoked: false,
          violation_tolerance: 1,
          cost: "0",
          fee: "0",
          currencyType: "USD",
          purge_code: "456789",
          proctoring_tolerance: idOnlyTolerance,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 3,
          name: "Basic Proctoring Key",
          proctoring_type: "AWS Rekognition",
          duration_minutes: 90,
          description: "ID + camera view — recommended for local dev",
          organization_id: 1,
          key_id: "KEY-DEVBASIC",
          proctoring_type_ids: "{1,2}",
          created_by: 2,
          expires_at: oneYear,
          revoked: false,
          violation_tolerance: 2,
          cost: "0",
          fee: "0",
          currencyType: "USD",
          purge_code: "456789",
          proctoring_tolerance: basicTolerance,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 4,
          name: "Test Org Key",
          proctoring_type: "AWS Rekognition",
          duration_minutes: 60,
          description: "Key for Test Organization",
          organization_id: 2,
          key_id: "KEY-TESTORG",
          proctoring_type_ids: "{1,2}",
          created_by: 3,
          expires_at: oneYear,
          revoked: false,
          violation_tolerance: 1,
          cost: "0",
          fee: "0",
          currencyType: "USD",
          purge_code: "456789",
          proctoring_tolerance: basicTolerance,
          createdAt: now,
          updatedAt: now,
        },
      ],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("ProctoringKeys", { id: [1, 2, 3, 4] }, {});
  },
};
