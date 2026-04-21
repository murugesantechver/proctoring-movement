'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Sessions');

    // 1. Remove user_id if it exists
    if (table.user_id) {
      await queryInterface.removeColumn('Sessions', 'user_id');
    }

    // 2. Add first_name if it doesn't exist
    if (!table.first_name) {
      await queryInterface.addColumn('Sessions', 'first_name', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Proctor',
      });
    }

    // 3. Add last_name if it doesn't exist
    if (!table.last_name) {
      await queryInterface.addColumn('Sessions', 'last_name', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'User',
      });
    }

    // 4. Enforce NOT NULL (defensive)
    await queryInterface.changeColumn('Sessions', 'first_name', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn('Sessions', 'last_name', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    // 5. Drop default on status (if exists)
    await queryInterface.sequelize.query(`
      ALTER TABLE "Sessions" ALTER COLUMN "status" DROP DEFAULT;
    `);

    // 6. Rename old enum if not already renamed
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'enum_Sessions_status'
        )
        AND NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'enum_Sessions_status_old'
        ) THEN
          ALTER TYPE "enum_Sessions_status" RENAME TO "enum_Sessions_status_old";
        END IF;
      END$$;
    `);

    // 7. Create new enum safely
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'enum_Sessions_status'
        ) THEN
          CREATE TYPE "enum_Sessions_status" AS ENUM ('valid', 'in_progress', 'invalid');
        END IF;
      END$$;
    `);

    // 8. Alter column to use new enum
    await queryInterface.sequelize.query(`
      ALTER TABLE "Sessions"
      ALTER COLUMN "status" TYPE "enum_Sessions_status"
      USING status::text::"enum_Sessions_status";
    `);

    // 9. Update old values
    await queryInterface.sequelize.query(`
      UPDATE "Sessions"
      SET status = CASE
        WHEN status::text = 'active' THEN 'in_progress'::"enum_Sessions_status"
        WHEN status::text = 'closed' THEN 'valid'::"enum_Sessions_status"
        WHEN status::text = 'expired' THEN 'invalid'::"enum_Sessions_status"
        ELSE 'invalid'::"enum_Sessions_status"
      END;
    `);

    // 10. Drop old enum
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'enum_Sessions_status_old'
        ) THEN
          DROP TYPE "enum_Sessions_status_old";
        END IF;
      END$$;
    `);
  },
  

  async down (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Sessions');

    // Restore user_id
    if (!table.user_id) {
      await queryInterface.addColumn('Sessions', 'user_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      });
    }

    // Remove first_name and last_name if they exist
    if (table.first_name) {
      await queryInterface.removeColumn('Sessions', 'first_name');
    }
    if (table.last_name) {
      await queryInterface.removeColumn('Sessions', 'last_name');
    }

    // Drop default on status again
    await queryInterface.sequelize.query(`
      ALTER TABLE "Sessions" ALTER COLUMN "status" DROP DEFAULT;
    `);

    // Rename current enum
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Sessions_status" RENAME TO "enum_Sessions_status_new";
    `);

    // Recreate original enum
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_Sessions_status" AS ENUM ('active', 'closed', 'expired');
    `);

    // Recast column to original enum
    await queryInterface.sequelize.query(`
      ALTER TABLE "Sessions"
      ALTER COLUMN "status" TYPE "enum_Sessions_status"
      USING status::text::"enum_Sessions_status";
    `);

    // Revert enum values
    await queryInterface.sequelize.query(`
      UPDATE "Sessions"
      SET status = CASE
        WHEN status::text = 'in_progress' THEN 'active'::"enum_Sessions_status"
        WHEN status::text = 'valid' THEN 'closed'::"enum_Sessions_status"
        WHEN status::text = 'invalid' THEN 'expired'::"enum_Sessions_status"
        ELSE 'expired'::"enum_Sessions_status"
      END;
    `);

    // Drop the renamed enum
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_Sessions_status_new";
    `);
  }
};
