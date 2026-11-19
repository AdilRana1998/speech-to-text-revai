module.exports = (sequelize, DataTypes) => {
    const AssistantFiles = sequelize.define('assistant_files', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        threadId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        botId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        fileId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        fileHash: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        fileName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        status: {
            type: DataTypes.BOOLEAN, //1 means avaiable for use. 0 means not avaiable to use
            allowNull: false,
            defaultValue: false,
        },
        contentType: { //1 for getting the transctip from db and 0 for attachmnet
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: null,
        },
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return AssistantFiles;
}
