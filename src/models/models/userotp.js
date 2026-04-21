"use strict";
module.exports = (sequelize, DataTypes) => {
  const UserOtp = sequelize.define("UserOtp", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "Users", key: "id" },
    },

    otp: { type: DataTypes.STRING, allowNull: false },

    expiresAt: { type: DataTypes.DATE, allowNull: false },

    verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, { 
    timestamps: true 
  });

  return UserOtp;
};
