module.exports = (sequelize, DataTypes) => {
    const Subscription = sequelize.define('Subscription', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      organization_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Organizations', key: 'id' } },
      subscription_key: { type: DataTypes.STRING, unique: true, allowNull: false },
      plan: { type: DataTypes.STRING, allowNull: false },
      start_date: { type: DataTypes.DATE, allowNull: false },
      end_date: { type: DataTypes.DATE, allowNull: true },
      status: { type: DataTypes.STRING, defaultValue: 'active' },
    });
  
    return Subscription;
  };
  