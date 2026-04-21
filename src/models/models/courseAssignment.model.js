module.exports = (sequelize, DataTypes) => {
  const CourseAssignment = sequelize.define('CourseAssignment', {
    course_id: { type: DataTypes.INTEGER, allowNull: false },
    course_name: { type: DataTypes.STRING, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    first_name: { type: DataTypes.STRING, allowNull: false },
    last_name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    key_id: { type: DataTypes.STRING, allowNull: false },
    session_id: { type: DataTypes.UUID, allowNull: false },
    organization_id: { type: DataTypes.INTEGER, allowNull: false },
    user_name: { type: DataTypes.STRING, allowNull: true },
  }, {
    tableName: 'CourseAssignments'
  });

  return CourseAssignment;
};
