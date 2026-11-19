module.exports = (sequelize, DataTypes) => {
    const incCaseSettlementReport = sequelize.define('open-ai-prompts', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        requestUuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            unique: true
        },
        type: { //foregin key from inc_case table
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        prompt: {
            type: DataTypes.TEXT('long'),
            allowNull: false,
        },
        isActivated: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return incCaseSettlementReport;
}