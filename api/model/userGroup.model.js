const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const KolabryaGroups = sequelize.define('users_group', {
        id: {
            type: DataTypes.INTEGER, 
            primaryKey: true,
            autoIncrement: true, 
            allowNull: false,
        },  
        groupUuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        groupName: {
            type: DataTypes.STRING,
            allowNull: false,
            get() {
				const rawValue = this.getDataValue('groupName') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('groupName', transformedData);
			}
        },
        status: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        createdAt: {
            type: DataTypes.DATE
        },
    });
    return KolabryaGroups;
}
