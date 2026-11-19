module.exports = (sequelize, DataTypes) => {
    const Packages = sequelize.define('packages', {
        packageId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        packageUuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        plan: DataTypes.STRING,
        name: DataTypes.STRING,
        description: {
            type: DataTypes.TEXT,
        },
        price: {
            type: DataTypes.DOUBLE,
        },
        hours: DataTypes.INTEGER,
        currency: {
            type: DataTypes.STRING,
            defaultValue: "C$",
        },
        stripeId: {
            type: DataTypes.STRING,
        },
        buttonText: {
            type: DataTypes.STRING,
        },
        expiry: {
            type: DataTypes.STRING,
        }
    });

    return Packages
}