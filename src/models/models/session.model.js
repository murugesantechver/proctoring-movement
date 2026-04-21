  module.exports = (sequelize, DataTypes) => {
    const Session = sequelize.define("Session", {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      external_session_id: { type: DataTypes.STRING, allowNull: true, unique: true },
      key_id: { type: DataTypes.STRING, allowNull: false },
      organization_id: { type: DataTypes.INTEGER, allowNull: false },
      first_name: { type: DataTypes.STRING, allowNull: true },
      last_name: { type: DataTypes.STRING, allowNull: true },
      course_id: { type: DataTypes.INTEGER, allowNull: true },
      verification_status: { type: DataTypes.ENUM("pending", "approved", "rejected"), defaultValue: "pending" },
      override_status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, 
      override_reason: { type: DataTypes.TEXT, allowNull: true },
      started_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      ended_at: { type: DataTypes.DATE, allowNull: true },
      status: {type: DataTypes.ENUM("valid", "in_progress", "invalid"),  defaultValue: "in_progress",},
      user_image: {type: DataTypes.STRING,allowNull: true,},
      has_violations: {type: DataTypes.BOOLEAN,allowNull: false,defaultValue: false,},
      user_name: { type: DataTypes.STRING, allowNull: true },
      restart_date: {  type: DataTypes.DATE,  allowNull: true,  defaultValue: null},
    });

    return Session;
  };
