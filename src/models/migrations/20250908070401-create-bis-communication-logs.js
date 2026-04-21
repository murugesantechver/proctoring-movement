'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BisCommunicationLogs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      organization_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      session_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      header: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      payload: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      response: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      action: {
        type: Sequelize.STRING,
        allowNull: true
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('BisCommunicationLogs');
  }
};
