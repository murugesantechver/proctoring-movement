module.exports = (sequelize, DataTypes) => {
    const Report = sequelize.define('Report', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      session_id: { type: DataTypes.INTEGER, allowNull: false },
      event_id: { type: DataTypes.INTEGER, allowNull: false },
      organization_id: { type: DataTypes.INTEGER, allowNull: false },
      total_violations: { type: DataTypes.INTEGER, defaultValue: 0 },
      total_sessions: { type: DataTypes.INTEGER, defaultValue: 0 },
      total_users: { type: DataTypes.INTEGER, defaultValue: 0 },
      flagged_sessions: { type: DataTypes.INTEGER, defaultValue: 0 },
      report_type: { type: DataTypes.STRING, allowNull: false },
      completion_time: { type: DataTypes.TIME, allowNull: false },
      reviewer_id: { type: DataTypes.INTEGER, allowNull: true },
    });
  
    return Report;
  };
  