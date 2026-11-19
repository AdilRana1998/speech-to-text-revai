const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const CaseInterviews = sequelize.define('case_interviews', {
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
        caseId: { //forgeing key
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        interviewType: { //forgeing key from case_interview_types
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        fileDetails: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('fileDetails') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('fileDetails', transformedData);
            }
        },
        interviewRole: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('interviewRole') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('interviewRole', transformedData);
            }
        },
        interviewName: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('interviewName') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('interviewName', transformedData);
            }
        },
        interviewGoal: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('interviewGoal') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('interviewGoal', transformedData);
            }
        },
        interviewQuestion: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('interviewQuestion') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('interviewQuestion', transformedData);
            }
        },
        interviewDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        interviewLink: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('interviewLink') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('interviewLink', transformedData);
            }
        },
        isPromptProcessed: {
            type: DataTypes.BOOLEAN, // a seperate job will  work for it to complie the prompt
            allowNull: false,
            defaultValue: false,
        },
        isUpdated: {
            type: DataTypes.BOOLEAN, //1 is for if interview is edit
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
    return CaseInterviews;
}