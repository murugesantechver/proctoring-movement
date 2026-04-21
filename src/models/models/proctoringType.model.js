module.exports = (sequelize, DataTypes) => {
  const ProctoringType = sequelize.define("ProctoringType", {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: "ProctoringTypes",
    timestamps: false,
  });

  return ProctoringType;
};
