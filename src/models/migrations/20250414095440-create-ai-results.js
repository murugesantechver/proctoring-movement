'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await queryInterface.createTable("AIResults", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("uuid_generate_v4()"),
      },
      session_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "Sessions",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      result_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      raw_response: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      match: Sequelize.BOOLEAN,
      similarity: Sequelize.FLOAT,
      warning: Sequelize.STRING,
      person_count: Sequelize.INTEGER,
      detected_objects: Sequelize.ARRAY(Sequelize.STRING),
      id_status: Sequelize.STRING,
      expiry_status: Sequelize.STRING,
      extracted_text: Sequelize.ARRAY(Sequelize.STRING),
      first_name_match: Sequelize.BOOLEAN,
      last_name_match: Sequelize.BOOLEAN,
      response_time: Sequelize.STRING,
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable("AIResults");

  }
};
