const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const IncCaseTypesABMatter = sequelize.define('inc_case_type_ab_matter', {
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
        incCaseTypeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        incCaseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        applicantiffFirstName: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null,
            get() {
                const rawValue = this.getDataValue('applicantiffFirstName') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('applicantiffFirstName', transformedData);
            }
        },
        applicantiffLastName: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null,
            get() {
                const rawValue = this.getDataValue('applicantiffLastName') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('applicantiffLastName', transformedData);
            }
        },
        applicantiffDOB: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        insuredDefendantAB: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null,
            get() {
                const rawValue = this.getDataValue('insuredDefendantAB') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('insuredDefendantAB', transformedData);
            }
        },
        dateOfLossAB: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        applicantiffInMIG: {
            type: DataTypes.BOOLEAN,
            defaultValue: null,
            allowNull: true,
        },
        disputingCAT: {
            type: DataTypes.BOOLEAN,
            defaultValue: null,
            allowNull: true,
        },
        summaryOfOCF18: {
            type: DataTypes.BOOLEAN,
            defaultValue: null,
            allowNull: true,
        },
        summaryOfOCF6: {
            type: DataTypes.BOOLEAN,
            defaultValue: null,
            allowNull: true,
        },
        attendantCareDispute: {
            type: DataTypes.BOOLEAN,
            defaultValue: null,
            allowNull: true,
        },
        specifiedBenefitsDispute: {
            type: DataTypes.BOOLEAN,
            defaultValue: null,
            allowNull: true,
        },
        isActivated: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
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
    return IncCaseTypesABMatter;
}