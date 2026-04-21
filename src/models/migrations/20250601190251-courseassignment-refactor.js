'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Clear existing data (optional)
    await queryInterface.sequelize.query('DELETE FROM "CourseAssignments";');

    // Ensure session_id column exists as UUID (add if missing)
    const tableDesc = await queryInterface.describeTable('CourseAssignments');

    if (!tableDesc.session_id) {
      await queryInterface.addColumn('CourseAssignments', 'session_id', {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      });
    }

    // organization_id as INTEGER with FK to Organizations
    if (!tableDesc.organization_id) {
      await queryInterface.addColumn('CourseAssignments', 'organization_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
      });
    }
    // Remove existing FK constraint if exists before adding new one (safe)
    await queryInterface.removeConstraint('CourseAssignments', 'CourseAssignments_organization_id_fkey').catch(() => {});
    await queryInterface.sequelize.query(`
      ALTER TABLE "CourseAssignments"
      ALTER COLUMN "organization_id" TYPE INTEGER
      USING "organization_id"::integer;
    `);
    await queryInterface.addConstraint('CourseAssignments', {
      fields: ['organization_id'],
      type: 'foreign key',
      name: 'CourseAssignments_organization_id_fkey',
      references: {
        table: 'Organizations',
        field: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    // Add id as primary key (if missing)
    if (!tableDesc.id) {
      await queryInterface.addColumn('CourseAssignments', 'id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      });
    }

    // Rename courseId and keyId to snake_case if needed
    if (tableDesc.courseId) {
      await queryInterface.renameColumn('CourseAssignments', 'courseId', 'course_id');
    }
    if (tableDesc.keyId) {
      await queryInterface.renameColumn('CourseAssignments', 'keyId', 'key_id');
    }

    // Add missing columns with default values if needed
    const addColumnIfMissing = async (col, type, defVal) => {
      if (!tableDesc[col]) {
        await queryInterface.addColumn('CourseAssignments', col, {
          type,
          allowNull: false,
          defaultValue: defVal,
        });
      }
    };

    await addColumnIfMissing('course_name', Sequelize.STRING, 'unknown');
    await addColumnIfMissing('user_id', Sequelize.INTEGER, 0);
    await addColumnIfMissing('first_name', Sequelize.STRING, 'unknown');
    await addColumnIfMissing('last_name', Sequelize.STRING, 'unknown');
    await addColumnIfMissing('email', Sequelize.STRING, 'unknown');

    // Add foreign key for key_id to ProctoringKeys
    await queryInterface.removeConstraint('CourseAssignments', 'fk_courseassignments_key_id').catch(() => {});
    await queryInterface.addConstraint('CourseAssignments', {
      fields: ['key_id'],
      type: 'foreign key',
      name: 'fk_courseassignments_key_id',
      references: {
        table: 'ProctoringKeys',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove foreign keys
    await queryInterface.removeConstraint('CourseAssignments', 'CourseAssignments_organization_id_fkey').catch(() => {});
    await queryInterface.removeConstraint('CourseAssignments', 'fk_courseassignments_key_id').catch(() => {});

    // Remove columns added in up (check if exist)
    const tableDesc = await queryInterface.describeTable('CourseAssignments');

    const removeColumnIfExists = async (col) => {
      if (tableDesc[col]) {
        await queryInterface.removeColumn('CourseAssignments', col);
      }
    };

    await removeColumnIfExists('course_name');
    await removeColumnIfExists('user_id');
    await removeColumnIfExists('first_name');
    await removeColumnIfExists('last_name');
    await removeColumnIfExists('email');

    // session_id revert to UUID removal if desired (optional)
    await removeColumnIfExists('session_id');

    // organization_id revert to VARCHAR (if was changed)
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE "CourseAssignments"
        ALTER COLUMN "organization_id" TYPE VARCHAR(255)
        USING "organization_id"::varchar;
      `);
    } catch {}

    // Remove id column if exists
    await removeColumnIfExists('id');

    // Rename columns back to camelCase if needed
    if (tableDesc.course_id) {
      await queryInterface.renameColumn('CourseAssignments', 'course_id', 'courseId').catch(() => {});
    }
    if (tableDesc.key_id) {
      await queryInterface.renameColumn('CourseAssignments', 'key_id', 'keyId').catch(() => {});
    }
  }
};
