module.exports = (sequelize, DataTypes) => {
  const ProctoringRule = sequelize.define('ProctoringRule', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      organization_id: { type: DataTypes.INTEGER, allowNull: false },
      rule_name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      category: { type: DataTypes.STRING, allowNull: true },
  }, {
      tableName: 'ProctoringRules',
      timestamps: true,
  });

  return ProctoringRule;
};
