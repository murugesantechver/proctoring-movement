module.exports = (sequelize, DataTypes) => {
  const Job = sequelize.define(
    'Job',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      job_type: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
      payload: { type: DataTypes.JSONB, allowNull: true },
      response_data: { type: DataTypes.JSONB, allowNull: true },
      log: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      error: { type: DataTypes.JSONB, allowNull: true },
      triggeredUser: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      retry_flag: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      retry_status: { type: DataTypes.STRING, allowNull: true },
      retry_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'Jobs',
      timestamps: true,
    }
  );

  return Job;
}; 