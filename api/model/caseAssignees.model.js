module.exports = (sequelize, DataTypes) => {
	const CaseAssignees = sequelize.define('case_assignees', {
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
		caseId: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		assigneeUserId: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		assignedByUserId: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		firmId: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		role: {
			type: DataTypes.TINYINT,
			allowNull: true,
			defaultValue: null,
		},
		status: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true,
		},
		createdAt: {
			type: DataTypes.DATE
		},
		updatedAt: {
			type: DataTypes.DATE
		}
	});
	return CaseAssignees;
}