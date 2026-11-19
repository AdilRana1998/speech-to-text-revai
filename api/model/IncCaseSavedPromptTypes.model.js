module.exports = (sequelize, DataTypes) => {
    const IncCaseSavePromptsTypes = sequelize.define('inc_case_save_prompts_types', { 
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
        title: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        isGroup: {
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
    return IncCaseSavePromptsTypes;
}
