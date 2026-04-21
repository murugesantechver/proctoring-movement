module.exports = (sequelize, DataTypes) => {
  const Course = sequelize.define("Course", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    organization_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Organizations", key: "id" } },

  });

  return Course;
};
