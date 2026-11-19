module.exports = (sequelize, DataTypes) => {
    const vectorStoreManager = sequelize.define('inc_vector_store_manager', {
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
        vectorId: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        featureType: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        createdByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
        },
        fileIds: {  //remove this column after verificaation
            type: DataTypes.TEXT,
            allowNull: false,
        },
        fileCounts: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        isActivated: { 
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        status: { // pending, success, failed
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        jsonResponse: { 
            type: DataTypes.TEXT,
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return vectorStoreManager;
}