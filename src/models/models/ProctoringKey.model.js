module.exports = (sequelize, DataTypes) => {
    const ProctoringKey = sequelize.define("ProctoringKey", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING, allowNull: false },
      proctoring_type: { type: DataTypes.STRING, allowNull: false },
      duration_minutes: { type: DataTypes.INTEGER, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      organization_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Organizations", key: "id" } },
      key_id: { type: DataTypes.STRING, allowNull: false, unique: true},
      proctoring_type_ids: { type: DataTypes.ARRAY(DataTypes.INTEGER),allowNull: false,defaultValue: []},
      created_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Admins", key: "id" } },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      expires_at: { type: DataTypes.DATE, allowNull: true },
      revoked: { type: DataTypes.BOOLEAN, defaultValue: false },
      violation_tolerance: {type: DataTypes.INTEGER,allowNull: false,defaultValue: 1},
      cost: { type: DataTypes.STRING, allowNull: true,},
      fee: { type: DataTypes.STRING, allowNull: true},
      currencyType: { type: DataTypes.STRING, allowNull: true },
      purge_code: { type: DataTypes.STRING, allowNull: true },
      proctoring_tolerance: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    });
  
    return ProctoringKey;
  };
  