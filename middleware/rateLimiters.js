const rateLimit = require('express-rate-limit');

const make = (windowMs, limit) => rateLimit({
  windowMs,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later" }
});

module.exports = {
  loginLimiter: make(15 * 60 * 1000, 10),
  signupLimiter: make(60 * 60 * 1000, 10),
  otpLimiter: make(15 * 60 * 1000, 10),
  orderLimiter: make(60 * 60 * 1000, 20),
  apiLimiter: make(15 * 60 * 1000, 600)
};
