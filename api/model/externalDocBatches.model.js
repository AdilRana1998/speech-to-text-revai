module.exports = (sequelize, DataTypes) => {
    const ExternalDocBatch = sequelize.define('external_doc_batches', {
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
        isActivated: { 
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    });
    return ExternalDocBatch;
}