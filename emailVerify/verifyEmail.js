const nodemailer = require('nodemailer');
require('dotenv').config();

const verifyEmail=(token, email, frontendUrl)=>{
  const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use 'hotmail', 'yahoo', etc.
    auth: {
        user: process.env.EMAIL_USER, // your email
        pass: process.env.EMAIL_PASS  // app password if using Gmail
    }
});
const mailConfiguration = {
            from: `"KMart :" <${process.env.EMAIL_USER}>`,
            to:       email,
            subject:  `Email Verification`,
            text:     `Click this link to verify your email: ${frontendUrl}/verify/${token}   ThankYou!`
 };
 transporter.sendMail(mailConfiguration, function (error, info) {
    if (error) {
        console.error("Email sending failed:", error);
        return;
    }

    console.log("Email Sent Successfully");
    console.log(info.response);
});
}


module.exports = verifyEmail;