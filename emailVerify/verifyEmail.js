const nodemailer = require('nodemailer');
require('dotenv').config();

// B1 (AB-009): returns a promise instead of silently swallowing errors.
const verifyEmail = async (token, email, frontendUrl, backendUrl) => {
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
    subject: `Email Verification`,
    text: `Click this link to verify your email: ${backendUrl}/verify-email/${token}   ThankYou!`
  });
};

module.exports = verifyEmail;