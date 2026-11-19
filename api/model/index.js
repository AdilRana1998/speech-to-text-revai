const { Sequelize, DataTypes, QueryTypes, Op } = require('sequelize');
const { Jsons } = require('../../utils')
const {
    database
} = require('../../config');
const sequelize = new Sequelize(database.name, database.user, database.password, {
    host: database.host,
    dialect: database.driver,
    pool: {
        max: 100,
        min: 10,
        idle: 10000
    },
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    define: {
        freezeTableName: true
    },
    //timezone: '-04:00',
    logging: false,
    // logging: (sql, { bind }) => {
    //     console.log(`SQL: ${sql}`); 
    //     console.log('Parameters:', bind);
    // },
});
const forceVal = false
//sequelizer tutorial : https://www.youtube.com/watch?v=9D28zQVh7Uk&list=PLolI8AY2AS9YO1kf0i_ui5_sKtxZg-yiR&index=19

//init queryInterface;
const queryInterface = sequelize.getQueryInterface();

const queryInterfaceFunc = async () => {
    // await queryInterface.addColumn('users', 'groupId', {
    //     type: DataTypes.INTEGER,
    //     allowNull: true,
    // });
}

const createView = () => {
    // const cardView = db.sequelize.query(`CREATE OR REPLACE VIEW cards AS
    //     select * from vehicles where user_id = 1;
    // ;`);
}

sequelize.authenticate().then(() => {
    console.log("Connected");
}).catch(e => {
    console.log("Error ", e.message);
})

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.op = Op;
db.queryType = QueryTypes;

const setAssociation = async () => {
    try {
        var res_usersTypes = await db.users_types.findAll({});
        if (res_usersTypes.length === 0) {
            await db.users_types.bulkCreate((await Jsons.database()).userType);
        }
        await db.users.bulkCreate((await Jsons.database()).users)
        await db.packages.bulkCreate(((await Jsons.database()).products));
    } catch (e) {
        console.log(e.message)
    }

}

db.sequelize.sync({ force: forceVal })
    .then(() => {
        if (forceVal) {
            console.log('yes re-sync');
            setAssociation();
        }

    })
    .catch(e => {
        console.log("syncError", e.message);
    })

db.users = require('./users.model')(sequelize, DataTypes);
db.speechToText = require('./speechToText.model.js')(sequelize, DataTypes);


//Query Interface
queryInterfaceFunc();

//creating Views
createView();

module.exports = db;