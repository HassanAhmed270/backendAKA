const nodemailer = require('nodemailer');
require('dotenv').config();

const sentOTPMail=(otp, email)=>{
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
            subject:  `PASSWORD RESET OTP`,
            html:     `This is your OTP<b> ${otp}</b>`
 };
 transporter.sendMail(mailConfiguration, function(error,info){
    if(error){throw Error(error)}
    console.log("OTP Sent Successfully");
    console.log(info);
 })
}


module.exports = sentOTPMail;