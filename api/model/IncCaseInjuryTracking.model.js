const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const incCaseInjuryTracking = sequelize.define('inc_case_injury_tracking', {
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
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        incCaseId: { //foregin key from inc_case table
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        jobUuid: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        response: { 
            type: DataTypes.JSON, 
            allowNull: true,
            defaultValue: null
        },
        isActivated: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        status: { // pending, success, failed
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return incCaseInjuryTracking;
}