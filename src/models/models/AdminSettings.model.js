module.exports = (sequelize, DataTypes) => {
    const AdminSettings = sequelize.define('AdminSettings', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        orgId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Organizations', key: 'id' } },
        settings: { type: DataTypes.JSONB, allowNull: false },
        lastUpdatedBy: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' } },
    }, { timestamps: true });

    return AdminSettings;
};
