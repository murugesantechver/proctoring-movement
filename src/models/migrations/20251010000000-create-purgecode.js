"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("PurgeCodes", {
      id: { 
        type: Sequelize.INTEGER, 
        primaryKey: true, 
        autoIncrement: true 
      },
      purge_code: { 
        type: Sequelize.STRING, 
        allowNull: false,
        unique: true
      },
      organization_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false,
        references: { 
          model: "Organizations", 
          key: "id" 
        },
        onDelete: "CASCADE"
      },
      createdAt: { 
        type: Sequelize.DATE, 
        allowNull: false, 
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") 
      },
      updatedAt: { 
        type: Sequelize.DATE, 
        allowNull: false, 
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") 
      }
    });

    // Add index for better performance
    await queryInterface.addIndex("PurgeCodes", ["organization_id"]);
    await queryInterface.addIndex("PurgeCodes", ["purge_code"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("PurgeCodes");
  }
};
