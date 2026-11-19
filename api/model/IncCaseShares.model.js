module.exports = (sequelize, DataTypes) => {
    const IncCaseShares = sequelize.define('inc_case_shares', {
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
        },
        incCaseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        sharedByUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        sharedWithUserId: {
            type: DataTypes.INTEGER,
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
    }, {
        indexes: [
            {
                unique: true,
                fields: ['incCaseId', 'sharedWithUserId', 'requestUuid']
            }
        ]
    });

    return IncCaseShares;
};