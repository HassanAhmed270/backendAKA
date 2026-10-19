const sendMail = require('../utils/sendMail.js');

// Same signature as before: sentOTPMail(otp, email).
// Returns a promise that REJECTS if the email could not be sent.
const sentOTPMail = async (otp, email) => {
  await sendMail({
    to: email,
    subject: "PASSWORD RESET OTP",
    text: `This is your OTP: ${otp}`,
    html: `This is your OTP<b> ${otp}</b>`,
  });
};

module.exports = sentOTPMail;