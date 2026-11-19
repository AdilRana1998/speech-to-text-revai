const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const IncCaseResponses = sequelize.define('inc_case_responses', { 
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
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        title: {
            type: DataTypes.TEXT('long'),
            allowNull: false,
            get() {
				const rawValue = this.getDataValue('title') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('title', transformedData);
			}
        },
        description: {
            type: DataTypes.TEXT('long'),
            allowNull: false,
            get() {
				const rawValue = this.getDataValue('description') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('description', transformedData);
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
    return IncCaseResponses;
}
