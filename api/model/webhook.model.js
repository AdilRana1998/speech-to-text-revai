module.exports = (sequelize, DataTypes) => {
    const Webhook = sequelize.define('webhook', {
        webhookId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: DataTypes.STRING,
        jsonData: {
            type: DataTypes.TEXT,
        }
    });
    return Webhook
}