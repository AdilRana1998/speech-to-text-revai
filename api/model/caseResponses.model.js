const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const CaseResponses = sequelize.define('case_responses', { 
        id: {
            type: DataTypes.INTEGER, 
            primaryKey: true,
            autoIncrement: true,
            allowNull: false, 
        },
        caseResponseUuid: {
            type: DataTypes.UUID, 
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        caseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        caseResponseTitle: {
            type: DataTypes.TEXT,
            allowNull: false,
            get() {
				const rawValue = this.getDataValue('caseResponseTitle') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('caseResponseTitle', transformedData);
			}
        },
        caseResponse: {
            type: DataTypes.TEXT('long'),
            allowNull: false,
            get() {
				const rawValue = this.getDataValue('caseResponse') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('caseResponse', transformedData);
			},
        },
        status: {
            type: DataTypes.BOOLEAN, //1 means avaiable for use. 0 means not avaiable to use
            allowNull: false,
            defaultValue: true,
        },
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return CaseResponses;
}
