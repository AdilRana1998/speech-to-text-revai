const Controller = {};
const { sendStatus } = require("../../utils"); 
const { OTPServices } = require("../services");

Controller.postOTP = async (req, res, next) => {
  const result = await OTPServices.post(req.jsonObject);
  sendStatus.data.sortStatus(res, req, result.obj, result.message, "Post-OTP", result.statusCode);
};

Controller.verifyOtp = async (req, res, next) => {
  const result = await OTPServices.verify(req.jsonObject);
  sendStatus.data.sortStatus(res, req, result.obj, result.message, "Verify-OTP", result.statusCode);
};

Controller.exposeOTP = async (req, res, next) => {
  const result = await OTPServices.exposeOTP(req.jsonObject);
  sendStatus.data.sortStatus(res, req, result.obj, result.message, "Expose-OTP", result.statusCode);
};

Controller.resendOTP = async (req, res, next) => {
  const result = await OTPServices.resendPostOtp(req.jsonObject);
  sendStatus.data.sortStatus(res, req, result.obj, result.message, "Resend-OTP", result.statusCode);
};

Controller.expireOTP = async (req, res, next) => {
  const result = await OTPServices.expireOTP();
  sendStatus.data.sortStatus(res, req, result.obj, result.message, "Expire-OTP", result.statusCode);
};

module.exports = Controller;