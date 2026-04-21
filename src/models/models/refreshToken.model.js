module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define('RefreshToken', {
    token: { type: DataTypes.STRING, allowNull: false, unique: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' } },
    expiry_date: { type: DataTypes.DATE, allowNull: false },
  });
  return RefreshToken;
};
