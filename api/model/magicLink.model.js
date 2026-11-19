const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const KolabryaMagicLink = sequelize.define('kolabrya_magic_link', {
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
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        magicLink: {
            type: DataTypes.STRING,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('magicLink') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('magicLink', transformedData);
            }
        },
        featureType: {
            type: DataTypes.INTEGER,
        },
        isSent: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        isResend: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        isVerified: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        isExpired: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        isActivated: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return KolabryaMagicLink;
}