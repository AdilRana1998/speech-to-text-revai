module.exports = (sequelize, DataTypes) => {
      const CalendarEvents = sequelize.define('calendar_events', {
            id: {
                  type: DataTypes.INTEGER,
                  primaryKey: true,
                  autoIncrement: true,
            },
            start_time: {
                  type: DataTypes.DATE,
                  allowNull: false,
            },
            end_time: {
                  type: DataTypes.DATE,
                  allowNull: false,
            },
            botId: {
                  type: DataTypes.STRING,
            },
            event_id: {
                  type: DataTypes.STRING
            },
            isDisconnected: {
                  type: DataTypes.BOOLEAN,
                  defaultValue: false,
                  allowNull: false
            },
            user_id: {
                  type: DataTypes.STRING,
            },
            calendar_id: {
                  type: DataTypes.STRING,
            },
            type: {
                  type: DataTypes.STRING,
            },
            user_id: {
                  type: DataTypes.STRING,
            },
            email: {
                  type: DataTypes.STRING,
                  validate: {
                        isEmail: true
                  }
            },
            raw: {
                  type: DataTypes.JSON,
                  get() {
                        const rawValue = this.getDataValue('raw');

                        if (typeof rawValue === 'object') {
                              // If the value is already an object, return it directly
                              return rawValue;
                        }

                        try {
                              return rawValue ? JSON.parse(rawValue) : rawValue;
                        } catch (error) {
                              console.error(`Error parsing JSON for 'raw' column: ${error}`);
                              return null; // or handle the error in a way that fits your application
                        }
                  }
            },
            platform: {
                  type: DataTypes.STRING,
            },
            platform_id: {
                  type: DataTypes.STRING,
            },
            ical_uid: {
                  type: DataTypes.STRING,
            },
            meeting_platform: {
                  type: DataTypes.STRING,
            },
            meeting_url: {
                  type: DataTypes.STRING,
            },
            is_deleted: {
                  type: DataTypes.BOOLEAN,
            },
      }, {
            indexes: [
                  {
                        unique: true,
                        fields: ['event_id', 'calendar_id'],
                  },
            ],
      });

      return CalendarEvents
}