const OTPServices = {};
const {
  OTPQueries,
  UserQueries,
  RoleQueries,
  BusinessQueries,
  UserGroupQueries
} = require("../queries");
const { Strings, JWT, OTP, Emails, Payments } = require("../../utils");
const moment = require('moment');

const createOtp = async (userId, email, otpType) => {
  const otpCode = OTP.generateOTP();
  const otp = await OTPQueries.create({
    userId: userId,
    otpCode: otpCode,
    otpType: otpType,
    otpHash: OTP.hashOTP(otpCode),
    createdBy: userId
  });
  Emails.sendOTP(email, "OTP Generated Successfully", otpCode);
  return otp.otpUuid;
}

OTPServices.post = async (obj) => {
  try {
    var response = await UserQueries.getUsersByEmail(obj.email);
    if (response.length > 0) {
      const validateOtpRegeration = await OTPQueries.validateOtpRegeration(response[0].userId);
      if (validateOtpRegeration.length <= 0) {
        const otp_id = await createOtp(response[0].userId, obj.email, obj.otpType);
        return {
          message: Strings.OTP_TYPE.OTP_SENT_SUCCESSFULLY,
          statusCode: 200,
          obj: {
            otpUuid: otp_id,
            email: obj.email
          }
        };
      } else {
        return {
          message: Strings.OTP_TYPE.OTP_ALREADY_GENERATED,
          statusCode: 400,
          obj: {}
        }
      }
    } else {
      return {
        message: Strings.ROOM.EMPTY,
        statusCode: 200,
        obj: {},
      };
    }
  } catch (error) {
    console.log("error in post otp", error);
    return {
      message: Strings.ERROR.SOME_THING_WENT_WRONG,
      statusCode: 400,
      obj: {
        error: error.message
      }
    }
  }
};


OTPServices.resendPostOtp = async (obj) => {
  try {
    if (obj.email && obj.otpUuid) {
      var response = await UserQueries.getUsersByEmail(obj.email);
      if (response.length > 0) {
        const validateOtpRegeration = await OTPQueries.findExpired(response[0].userId, obj.otpUuid);

        console.log("validateOtpRegeration 1", validateOtpRegeration.length);
        console.log("validateOtpRegeration 2", validateOtpRegeration);
        console.log("validateOtpRegeration 3", validateOtpRegeration[0]?.isExpired == 1);

        if (validateOtpRegeration.length > 0 && validateOtpRegeration[0]?.isExpired == 1) {
          const otp_id = await createOtp(response[0].userId, obj.email, obj.otpType);
          return {
            message: Strings.OTP_TYPE.OTP_SENT_SUCCESSFULLY,
            statusCode: 200,
            obj: {
              otpUuid: otp_id,
              email: obj.email
            }
          };
        }
        else if (validateOtpRegeration.length > 0 && validateOtpRegeration[0]?.isExpired == 0) {
          return {
            message: Strings.OTP_TYPE.OTP_ALREADY_GENERATED,
            statusCode: 400,
            obj: {}
          }
        }
        else {
          return {
            message: Strings.ROOM.EMPTY,
            statusCode: 400,
            obj: {},
          };
        }
      } else {
        return {
          message: Strings.ROOM.EMPTY,
          statusCode: 200,
          obj: {},
        };
      }
    } else {
      return {
        message: Strings.UNVALID_STATUS,
        statusCode: 400,
        obj: {}
      }
    }
  } catch (error) {
    console.log("error in resend otp", error);
    return {
      message: Strings.ERROR.SOME_THING_WENT_WRONG,
      statusCode: 400,
      obj: {
        error: error.message
      }
    }
  }
};

OTPServices.exposeOTP = async (obj) => {
  try {
    var response = await UserQueries.getUsersByEmail(obj.email);
    if (response.length > 0) {
      const otp = await OTPQueries.getOTP(response[0].userId)
      return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: otp
      };
    } else {
      return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: {},
      };
    }
  } catch (error) {
    console.log("error in exposeOTP otp", error);
    return {
      message: Strings.ERROR.SOME_THING_WENT_WRONG,
      statusCode: 400,
      obj: {
        error: error.message
      }
    }
  }
};

OTPServices.resendOtp = async (obj) => {
  var response = await UserQueries.getUsersByEmail(obj.email);
  if (response.length > 0) {
    const otp_id = await createOtp(response[0].id, obj.email, obj.otpType);
    return {
      message: Strings.SUCCESS_MESSAGES.EMAIL_SENT,
      statusCode: 200,
      obj: {
        otpUuid: otp_id
      },
    };
  } else {
    return {
      message: Strings.SUCCESS_MESSAGES.EMAIL_SENT,
      statusCode: 200,
      obj: {},
    };
  }
};

OTPServices.verify = async (obj) => {
  try {
    var response = await OTPQueries.getEntry(obj.otpType, obj.otpCode, obj.otpUuid);
    if (response != null) {
      if (Strings.OTP_TYPE.SIGN_IN == obj.otpType) {
        if (response.isExpired == '0') {
          const user = await UserQueries.getUser(response.userId);
          if (user) {
            await OTPQueries.update({ isEmailSent: true, isUsed: true, isVerified: true }, response.id);
            const tokenDetails = JWT.data.generate(user.userId)
            const refreshTokenDetails = JWT.data.refreshToken(user.userId)
            const updateToken = {
              token: tokenDetails.token,
              tokenExpiry: moment(tokenDetails.tokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
              refreshToken: refreshTokenDetails.token,
              refreshTokenExpiry: moment(refreshTokenDetails.refreshTokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
            }
            await UserQueries.updateUser(updateToken, response.userId);
            const result = await UserQueries.getUser(response.userId)
            if (result?.groupId) {
              const getGroupName = await UserGroupQueries.getGroupById(result.groupId);
              result.companyName = getGroupName.groupName;
              if (user?.email?.toLowerCase().endsWith("@okellrehab.com") || user?.email?.toLowerCase().endsWith("@mailinator.com")) {
                result.tabName = "Okell File Summary";
              }
            }
            if (result?.companyId) {
              const checkOwner = await UserGroupQueries.findOwner(result.companyId, response.userId);
              if (checkOwner) {
                result.isOwner = true;
              }
            }
            //Subscription type
            if (result.subscription == 1) {
              result.subscription = true
            }
            else {
              result.subscription = false
            }
            result.token = updateToken.token;
            result.tokenExpiry = updateToken.tokenExpiry;
            result.refreshToken = updateToken.refreshToken;
            result.refreshTokenExpiry = updateToken.refreshTokenExpiry;
            if (result.userTypeId == 1) {
              result.userType = 'admin';
            }
            else if (result.userTypeId == 2) {
              result.userType = 'user';
            }
            else if (result.userTypeId == 3) {
              result.userType = 'assistant';
            }
            else if (result.userTypeId == 4) {
              result.userType = 'assistant-user';
            }
            else {
              result.userType = 'user';
            }
            return {
              message: Strings.SUCCESS_MESSAGES.LOGGED_IN,
              statusCode: 200,
              obj: result
            };
          } else {
            return {
              message: Strings.ROOM.EMPTY,
              statusCode: 200,
              obj: {},
            };
          }
        } else {
          return {
            message: Strings.OTP_TYPE.OTP_EXPIRED,
            statusCode: 400,
            obj: {}
          };
        }
      } else {
        return {
          message: Strings.UNVALID_STATUS,
          statusCode: 400,
          obj: {},
        };
      }
    } else {
      return {
        message: Strings.UNVALID_STATUS,
        statusCode: 400,
        obj: {},
      };
    }
  } catch (error) {
    console.log("error in verify otp", error);
    return {
      message: Strings.ERROR.SOME_THING_WENT_WRONG,
      statusCode: 400,
      obj: {
        error: error.message
      }
    }
  }
};

OTPServices.getOtpTypes = async (id) => {
  var response = Strings.otpType;
  return {
    message: Strings.SUCCESS,
    statusCode: 200,
    obj: response,
  };
};

OTPServices.expireOTP = async () => {
  try {
    const data = await OTPQueries.validateOtp();
    if (data.length > 0) {
      console.log("**************************");
      console.log("Job Started to Disable OTP");
      console.log("**************************");
      for (let index = 0; index < data.length; index++) {
        const element = data[index];
        console.log(element.otpUuid);
        const obj = {
          isExpired: true
        }
        await OTPQueries.expireOtp(obj, element.otpUuid)
      }
      console.log("************************");
      console.log("Job Ended to Disable OTP");
      console.log("************************");
      return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: {
          message: Strings.RECORD_UPDATE_SUCCESS
        }
      };
    } else {
      return {
        message: Strings.ROOM.EMPTY,
        statusCode: 200,
        obj: {}
      };
    }
  } catch (error) {
    console.log("Error in expirying the otp after 5 miutes:", error);
    return {
      message: Strings.ERROR.SOME_THING_WENT_WRONG,
      statusCode: 400,
      obj: {
        error: error.message
      }
    };
  }
};


module.exports = OTPServices;