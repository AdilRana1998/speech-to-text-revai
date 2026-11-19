module.exports = (sequelize, DataTypes) => {
    const CaseIntakeQueries = sequelize.define('case_intake_queries', {
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
        titleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        queryName : {
            type: DataTypes.TEXT('long'), 
            allowNull: false
        },
        prompt : {
            type: DataTypes.TEXT('long'), 
            allowNull: false
        },
        textArea : {
            type: DataTypes.BOOLEAN,
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
    return CaseIntakeQueries;
}
