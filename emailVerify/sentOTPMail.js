const nodemailer = require('nodemailer');
require('dotenv').config();

// B1 (AB-009): returns a promise; callers must await it inside try/catch.
// Previously it threw inside the sendMail callback, which could crash the process.
const sentOTPMail = async (otp, email) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: `"AKA WMart :" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `PASSWORD RESET OTP`,
    html: `This is your OTP<b> ${otp}</b>`
  });
};

module.exports = sentOTPMail;