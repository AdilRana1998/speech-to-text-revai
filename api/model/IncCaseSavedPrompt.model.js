const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const IncCaseSavePrompts = sequelize.define('inc_case_save_prompts', { 
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
        promptType: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
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
    return IncCaseSavePrompts;
}
