module.exports = (sequelize, DataTypes) => {
    const ForgotPassword = sequelize.define('forgotPassword', {
        forgotId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        forgotUuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            validate: {
                isEmail: true
            }
        },
        isUsed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    });

    return ForgotPassword
}