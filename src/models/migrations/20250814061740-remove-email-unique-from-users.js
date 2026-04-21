'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeConstraint('Users', 'Users_email_key');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addConstraint('Users', {
      fields: ['email'],
      type: 'unique',
      name: 'Users_email_key'
    }); 
  }
};
