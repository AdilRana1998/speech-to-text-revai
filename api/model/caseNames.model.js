const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const CaseNames = sequelize.define('case_names', {
        id: {
            type: DataTypes.INTEGER, 
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        caseUuid: {
            type: DataTypes.UUID, 
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        caseName: {
            type: DataTypes.STRING,
            allowNull: false,
            get() {
				const rawValue = this.getDataValue('caseName') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('caseName', transformedData);
			}
        },
        createdByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
        },
        summary: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null,
            get() {
				const rawValue = this.getDataValue('summary') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('summary', transformedData);
			}
        },
        isProcessed: {
            type: DataTypes.BOOLEAN, //1 means avaiable for use. 0 means not avaiable to use
            defaultValue: null,
        },
        status: {
            type: DataTypes.BOOLEAN, //1 means avaiable for use. 0 means not avaiable to use
            allowNull: false,
            defaultValue: true,
        },
        createdAt: {
            type: DataTypes.DATE
        },
        caseTypeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: true,
        },
        isIntelligentMap: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
        },
    });
    return CaseNames;
}