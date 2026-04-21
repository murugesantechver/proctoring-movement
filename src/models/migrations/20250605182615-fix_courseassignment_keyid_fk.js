'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeConstraint('CourseAssignments', 'fk_courseassignments_key_id').catch(() => {});

    // Alter column key_id to VARCHAR(255)
    await queryInterface.sequelize.query(`
      ALTER TABLE "CourseAssignments"
      ALTER COLUMN "key_id" TYPE VARCHAR(255)
      USING "key_id"::varchar;
    `);

    // Add foreign key constraint referencing ProctoringKeys.key_id
    await queryInterface.addConstraint('CourseAssignments', {
      fields: ['key_id'],
      type: 'foreign key',
      name: 'fk_courseassignments_key_id',
      references: {
        table: 'ProctoringKeys',
        field: 'key_id',  // string column in ProctoringKeys
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeConstraint('CourseAssignments', 'fk_courseassignments_key_id').catch(() => {});

    // Alter column key_id back to INTEGER (if you want to revert)
    await queryInterface.sequelize.query(`
      ALTER TABLE "CourseAssignments"
      ALTER COLUMN "key_id" TYPE INTEGER
      USING "key_id"::integer;
    `);

    // Add foreign key constraint referencing ProctoringKeys.id (assuming id is integer)
    await queryInterface.addConstraint('CourseAssignments', {
      fields: ['key_id'],
      type: 'foreign key',
      name: 'fk_courseassignments_key_id',
      references: {
        table: 'ProctoringKeys',
        field: 'id',  // revert to integer PK
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  }
};
