const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 2, // Limit each IP to 2 requests per windowMs
  message: {
    statusCode: 429,
    message: "Too many login attempts from this IP. Please try again after 5 minutes.",
    obj: {}
  },
  keyGenerator: (req) => {
    // console.log("throttle middlware", req.ip);
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  }
});

module.exports = loginLimiter