module.exports = (sequelize, DataTypes) => {
    const UsersType = sequelize.define('userType', {
        usersTypeId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        title: DataTypes.STRING,
        description: {
            type: DataTypes.TEXT,
        }
    });

    return UsersType
}