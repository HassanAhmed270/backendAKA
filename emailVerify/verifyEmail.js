const nodemailer = require('nodemailer');
require('dotenv').config();

const verifyEmail=(token, email, frontendUrl, backendUrl)=>{
  const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use 'hotmail', 'yahoo', etc.
    auth: {
        user: process.env.EMAIL_USER, // your email
        pass: process.env.EMAIL_PASS  // app password if using Gmail
    }
});
const mailConfiguration = {
            from: `"AKA WMart :" <${process.env.EMAIL_USER}>`,
            to:       email,
            subject:  `Email Verification`,
            text:     `Click this link to verify your email: ${backendUrl}/verify-email/${token}   ThankYou!`
 };
 transporter.sendMail(mailConfiguration, function (error, info) {
    if (error) {
        return;
    }

});
}


module.exports = verifyEmail;