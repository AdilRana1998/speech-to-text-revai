const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const grokThreadsHistory = sequelize.define('grok_threads_history', {
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
            type: DataTypes.STRING(36),
            allowNull: false,
        },
        isActivated: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        title: {
            type: DataTypes.STRING,
            defaultValue: null,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('title') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('title', transformedData);
            }
        },
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return grokThreadsHistory;
}