module.exports = (sequelize, DataTypes) => {
    const UserPackages = sequelize.define('userPackages', {
        userPackagesId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userId: {
            type: DataTypes.INTEGER
        },
        packageId: DataTypes.INTEGER,
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }

    });

    return UserPackages
}