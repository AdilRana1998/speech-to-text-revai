const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const Firm = sequelize.define('firm_users_mapping', {
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
        firmName: {
            type: DataTypes.STRING,
            allowNull: false,
            get() {
                const rawValue = this.getDataValue('firmName') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('firmName', transformedData);
            }
        },
        // userId: {
        //     type: DataTypes.INTEGER,
        //     allowNull: false,
        // },
        memberCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        assistantCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
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
    return Firm;
}