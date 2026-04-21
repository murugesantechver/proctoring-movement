module.exports = (sequelize, DataTypes) => {
  const ProctoringNote = sequelize.define('ProctoringNote', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    key_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: { model: 'ProctoringKeys', key: 'key_id' },
      onDelete: 'SET NULL',
    },
    session_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: { model: 'Sessions', key: 'external_session_id' }, 
      onDelete: 'SET NULL',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onDelete: 'CASCADE',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    source: {
      type: DataTypes.ENUM('key_details', 'participant_view', 'main_admin'),
      allowNull: false,
    },
    organization_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Organizations',
        key: 'id',
      },
    },
  }, 
  {
    tableName: 'ProctoringNotes',
    timestamps: true,
  });

  return ProctoringNote;
};
