const Encryptions = require('../../utils/Encryptions'); 
const userPaymentExpiry = process.env.USER_PAYMENT_EXPIRY;

module.exports = (sequelize, DataTypes) => {
	const Users = sequelize.define('users', {
		userId: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		firstName: {
			type: DataTypes.STRING,
			get() {
				const rawValue = this.getDataValue('firstName') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('firstName', transformedData);
			},
		},
		lastName: {
			type: DataTypes.STRING,
			get() {
				const rawValue = this.getDataValue('lastName') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('lastName', transformedData);
			},
		},
		userUuid: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			allowNull: false,
		},
		email: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
			get() {
				const rawValue = this.getDataValue('email') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value.toLowerCase());
				this.setDataValue('email', transformedData);
			},
		},
		customerStripeId: {
			type: DataTypes.STRING,
		},
		paymentId: {
			type: DataTypes.STRING,
		},
		paymentPlan: {
			type: DataTypes.STRING,
		},
		paymentExpiry: {
			type: DataTypes.DATE,
			defaultValue: new Date(`${userPaymentExpiry}`), 
		},
		password: {
			type: DataTypes.STRING,
		},
		phNumber: {
			type: DataTypes.STRING,
			allowNull: true,
			get() {
				const rawValue = this.getDataValue('phNumber') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('phNumber', transformedData);
			},
		},
		googleAuthCode: {
			type: DataTypes.STRING
		},
		profilePic: {
			type: DataTypes.STRING,
		},
		firebaseToken: {
			type: DataTypes.STRING,
		},
		onlineStatus: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		token: {
			type: DataTypes.STRING,
		},
		tokenExpiry: {
			type: DataTypes.STRING,
		},
		refreshToken: {
			type: DataTypes.STRING,
		},
		refreshTokenExpiry: {
			type: DataTypes.STRING,
		},
		userTypeId: {
			type: DataTypes.INTEGER,
		},
		isFirstLogin: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		socialLogin: {
			type: DataTypes.STRING,
			defaultValue: null,
		},
		isVerified: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		isCitation: { 
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		isRemoved: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		subscription: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		subscriptionType: {
			type: DataTypes.TINYINT,
			allowNull: false,
			defaultValue: true,
		},
		auto_join: {
			type: DataTypes.BOOLEAN,
			default: false
		},
		popup: {
			type: DataTypes.BOOLEAN,
			defaultValue: true,
		},
		botName: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		recallVideoType: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true,
		},
		recallMediaEnable: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true,
		},
		groupId:{
			type: DataTypes.INTEGER,
			allowNull: true
		},
		createdBy: {
			type: DataTypes.BOOLEAN,
			allowNull: true,
		},
	});
	return Users;
};
