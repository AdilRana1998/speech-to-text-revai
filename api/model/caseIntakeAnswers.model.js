const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const CaseIntakeAnswers = sequelize.define('case_intake_answers', {
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
        caseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        queryId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        }, 
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        response: {
            type: DataTypes.TEXT('long'),
            allowNull: false,
            get() {
				const rawValue = this.getDataValue('response') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('response', transformedData);
			}
        },
        isUpdated: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isUsedByToc: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
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
    return CaseIntakeAnswers;
}
