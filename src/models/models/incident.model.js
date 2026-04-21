module.exports = (sequelize, DataTypes) => {
    const Incident = sequelize.define('Incident', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      session_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Sessions', key: 'id' } },
      violation_type: { type: DataTypes.INTEGER, allowNull: false },
      recording_id: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.STRING, defaultValue: 'pending' },
      incident_time: { type: DataTypes.DATE, allowNull: false },
      reviewed_by: { type: DataTypes.INTEGER, allowNull: true },
      review_notes: { type: DataTypes.TEXT, allowNull: true },
    });
  
    return Incident;
  };
  