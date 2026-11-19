module.exports = (sequelize, DataTypes) => {
    const CaseInterviewForm = sequelize.define('case_interview_form', {
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
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        key: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING, //drop down, input field, text area, datetime, files attachment
            allowNull: false,
        },
        required : {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        placeholder: {
            type: DataTypes.STRING,
            allowNull: true,
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
    return CaseInterviewForm;
}
