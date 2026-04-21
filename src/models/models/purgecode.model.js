module.exports = (sequelize, DataTypes) => {
  const PurgeCode = sequelize.define('PurgeCode', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    purge_code: { 
      type: DataTypes.STRING, 
      allowNull: false,
      unique: true
    },
    organization_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      references: { 
        model: 'Organizations', 
        key: 'id' 
      }
    }
  });

  return PurgeCode;
};
