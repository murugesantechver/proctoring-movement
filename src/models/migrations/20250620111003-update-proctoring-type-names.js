'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const updates = [
      { id: 1, name: 'Name and Photo ID Match' },
      { id: 2, name: 'Remain in Camera View' },
      { id: 3, name: 'No Other Participants' },
      { id: 4, name: 'No External Resources' },
      { id: 5, name: 'No Electronic Devices' },
      { id: 6, name: 'No Headphones' },
    ];

    for (const { id, name } of updates) {
      await queryInterface.bulkUpdate(
        'ProctoringTypes',
        { name },
        { id }
      );
    }
  },

  async down (queryInterface, Sequelize) {
     const originalNames = [
      { id: 1, name: 'Govt ID Verification' },
      { id: 2, name: 'Compare Face' },
      { id: 3, name: 'Multiple Persons' },
      { id: 4, name: 'Book Detection' },
      { id: 5, name: 'Phone Detection' },
      { id: 6, name: 'Headphone Detection' },
    ];

    for (const { id, name } of originalNames) {
      await queryInterface.bulkUpdate(
        'ProctoringTypes',
        { name },
        { id }
      );
    }
  }
};
