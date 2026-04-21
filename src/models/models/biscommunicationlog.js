module.exports = (sequelize, DataTypes) => {
  const BisCommunicationLog = sequelize.define("BisCommunicationLog", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    organization_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    session_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    header: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payload: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    response: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    action: {
      type: DataTypes.STRING,
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: "BisCommunicationLogs",
    timestamps: false,
  });

  return BisCommunicationLog;
};
