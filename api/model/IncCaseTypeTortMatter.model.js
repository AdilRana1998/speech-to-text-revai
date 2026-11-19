const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const IncCaseTypesTort = sequelize.define('inc_case_type_tort', {
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
        incCaseTypeId: { 
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        incCaseId: { 
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        plaintiffFirstName: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null,
            get() {
                const rawValue = this.getDataValue('plaintiffFirstName') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('plaintiffFirstName', transformedData);
            }
        },
        plaintiffLastName: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null,
            get() {
                const rawValue = this.getDataValue('plaintiffLastName') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('plaintiffLastName', transformedData);
            }
        },
        plaintiffDOB: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        insuredDefendant: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null,
            get() {
                const rawValue = this.getDataValue('insuredDefendant') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('insuredDefendant', transformedData);
            }
        },
        dateOfLoss: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        liabilityDispute: {
            type: DataTypes.BOOLEAN,
            defaultValue: null,
            allowNull: true,
        },
        incomeLoss: {
            type: DataTypes.BOOLEAN,
            defaultValue: null,
            allowNull: true,
        },
        housekeepingRequired: {
            type: DataTypes.BOOLEAN,
            defaultValue: null,
            allowNull: true,
        },
        futureCareNeeded: {
            type: DataTypes.BOOLEAN,
            defaultValue: null,
            allowNull: true,
        },
        outOfPocketExpenses: {
            type: DataTypes.BOOLEAN,
            defaultValue: null,
            allowNull: true,
        },
        previousAccident: {
            type: DataTypes.BOOLEAN,
            defaultValue: null,
            allowNull: true,
        },
        previousAccidentDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        subsequentAccident: {
            type: DataTypes.BOOLEAN,
            defaultValue: null,
            allowNull: true,
        },
        subsequentAccidentDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        isActivated: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        status: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return IncCaseTypesTort;
}