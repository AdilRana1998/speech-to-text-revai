module.exports = (sequelize, DataTypes) => {
    const MeetingSchedule = sequelize.define('meeting_schedule', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        email_id: {
            type: DataTypes.INTEGER
        },
        from: {
            type: DataTypes.STRING,
        },
        start_time: {
            type: DataTypes.DATE,
        },
        end_time: {
            type: DataTypes.DATE,
        },
        meeting_link: {
            type: DataTypes.TEXT
        },
        subject: {
            type: DataTypes.TEXT
        },
        status: {
            type: DataTypes.INTEGER
        },
        json_response: {
            type: DataTypes.TEXT
        },
        event_id: {
            type: DataTypes.STRING,
        },
        calendar_id: {
            type: DataTypes.STRING,
        },
        metadata: {
            type: DataTypes.JSON,
        },
        created_at: {
            type: DataTypes.DATE
        },
		add_agenda: {
			type: DataTypes.BOOLEAN,
			allowNull: true,
			defaultValue: null,
		}

    }, {
        indexes: [
            {
                unique: true,
                fields: ['event_id', 'calendar_id'],
            },
        ],
    });
    return MeetingSchedule
}