module.exports = (sequelize, DataTypes) => {
    const Payments = sequelize.define('payments', {
        paymentsId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        paymentsUuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER
        },
        stripeEventId: {
            type: DataTypes.STRING,
        },
        stripeProductId: {
            type: DataTypes.STRING,
        },
        stripeCheckoutId: {
            type: DataTypes.STRING,
        },
        stripeCheckoutResponse: {
            type: DataTypes.TEXT
        },
        stripeCheckoutCompleteResponse: {
            type: DataTypes.TEXT
        },
        stripeStatus: {
            type: DataTypes.STRING
        },
        stripePaymentStatus: {
            type: DataTypes.STRING
        },
        amount: {
            type: DataTypes.INTEGER
        },
        currency: {
            type: DataTypes.STRING
        },

    });
    return Payments
}