module.exports = (sequelize, DataTypes) => {
    const OrderBookingItems = sequelize.define('order_booking_items', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        // Foreign key to order_bookings.id (association registered in api/model/index.js)
        orderBookingId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        // NOTE: no products table/model exists in this project yet, so this is a plain
        // integer column without a foreign key constraint or association.
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                isInt: true,
                min: 1
            }
        },
        qty: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                isInt: true,
                min: 1
            }
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
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
                // join from order_bookings (include) and foreign key
                fields: ['orderBookingId']
            },
            {
                // future join / foreign key to a products table
                fields: ['productId']
            }
        ]
    });
    return OrderBookingItems;
}
