module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define("AuditLog", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    admin_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Admins", key: "id" } },
    organization_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Organizations", key: "id" } },
    action: { type: DataTypes.STRING, allowNull: false }, // e.g., "CREATE_KEY", "UPDATE_SETTINGS"
    action_type: { type: DataTypes.STRING, allowNull: false }, // e.g., "CREATE", "UPDATE", "DELETE"
    affected_entity: { type: DataTypes.STRING, allowNull: false }, // e.g., "ProctoringKey", "AdminSettings"
    description: { type: DataTypes.TEXT, allowNull: true },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  });

  return AuditLog;
};
