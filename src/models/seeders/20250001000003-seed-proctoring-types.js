"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // These match the hardcoded IDs used throughout the codebase
    // id: 1  = Name and Photo ID Match
    // id: 2  = Remain in Camera View
    // id: 3  = Active Participation
    // id: 4  = No Other Participants
    // id: 5  = No External Resources
    // id: 6  = No Electronic Devices
    // id: 7  = No Headphones
    // id: 8  = Single Monitor Only
    // id: 9  = Screen Monitoring
    // id: 10 = Full View of Monitor
    // id: 11 = No Extended Eye Closure

    await queryInterface.bulkInsert(
      "ProctoringTypes",
      [
        { id: 1,  name: "Name and Photo ID Match",   description: "Verify participant identity against government-issued ID" },
        { id: 2,  name: "Remain in Camera View",     description: "Detect if participant leaves the camera view" },
        { id: 3,  name: "Active Participation",      description: "Detect inactive or disengaged participant" },
        { id: 4,  name: "No Other Participants",     description: "Detect multiple persons in frame" },
        { id: 5,  name: "No External Resources",     description: "Detect books or printed materials" },
        { id: 6,  name: "No Electronic Devices",     description: "Detect phones or other devices" },
        { id: 7,  name: "No Headphones",             description: "Detect headphones or earbuds" },
        { id: 8,  name: "Single Monitor Only",       description: "Detect multiple monitors" },
        { id: 9,  name: "Screen Monitoring",         description: "Detect tab switching or screen minimizing" },
        { id: 10, name: "Full View of Monitor",      description: "Detect fullscreen exit or browser switch" },
        { id: 11, name: "No Extended Eye Closure",   description: "Detect prolonged eye closure" },
      ],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("ProctoringTypes", { id: [1,2,3,4,5,6,7,8,9,10,11] }, {});
  },
};
