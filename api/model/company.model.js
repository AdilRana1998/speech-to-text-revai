const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const Company = sequelize.define('company', {
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
        companyName: {
            type: DataTypes.STRING,
            allowNull: false,
            get() {
                const rawValue = this.getDataValue('companyName') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('companyName', transformedData);
            }
        },
        memberCount: {
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
    return Company;
}