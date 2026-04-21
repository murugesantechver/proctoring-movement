module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('CourseAssignments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      courseId: { type: Sequelize.INTEGER, allowNull: false },
      keyId: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('CourseAssignments');
  },
};
