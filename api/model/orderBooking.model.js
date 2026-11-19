module.exports = (sequelize, DataTypes) => {
    const OrderBooking = sequelize.define('order_bookings', {
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
        // NOTE: no customers table/model exists in this project yet, so this is a plain
        // integer column without a foreign key constraint or association.
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                isInt: true,
                min: 1
            }
        },
        // Authenticated user (req.userId) who created the booking; used to scope access.
        createdByUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'confirmed', 'cancelled']]
            }
        },
        totalAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
            validate: {
                isDecimal: true,
                min: 0
            }
        },
        createdAt: {
            type: DataTypes.DATE
        },
        updatedAt: {
            type: DataTypes.DATE
        }
    }, {
        indexes: [
            {
                // lookups by public identifier (get by id, cancel)
                unique: true,
                fields: ['requestUuid']
            },
            {
                // list by customer, scoped to the creating user, sorted by createdAt
                fields: ['createdByUserId', 'customerId', 'createdAt']
            },
            {
                // future join / foreign key to a customers table
                fields: ['customerId']
            }
        ]
    });
    return OrderBooking;
}
