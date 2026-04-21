module.exports = (sequelize, DataTypes) => {
    const Organization = sequelize.define('Organization', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING, allowNull: false },
      industry: { type: DataTypes.STRING, allowNull: true },
      subscription_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'Subscriptions', key: 'id' } },
      contact_email: { type: DataTypes.STRING, allowNull: false },
      contact_phone: { type: DataTypes.STRING, allowNull: true },
      notification_emails: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true, defaultValue: [], }
    });
  
    return Organization;
  };
  