module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      email: { type: DataTypes.STRING, allowNull: false },
      password: { type: DataTypes.STRING, allowNull: false },
      first_name: { type: DataTypes.STRING, allowNull: false },
      last_name: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: true },
      role: { type: DataTypes.ENUM('techv_admin', 'client_admin', 'participant'), allowNull: false },
      organization_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Organizations', key: 'id' } },
      status: { type: DataTypes.STRING, defaultValue: 'active' },
      last_login_at: { type: DataTypes.DATE, allowNull: true },
      user_name: { type: DataTypes.STRING, allowNull: true },
    });

    User.beforeUpdate(async (user) => {
    if (user.changed('password')) {
      const bcrypt = require('bcryptjs');
      user.password = await bcrypt.hash(user.password, 10);
    }
  });
    
    User.beforeCreate(async (user) => {
    const bcrypt = require('bcryptjs');
    user.password = await bcrypt.hash(user.password, 10);
  });
  
    return User;
  };
  