const sendMail = require('../utils/sendMail.js');

// Same signature as before: verifyEmail(token, email, frontendUrl, backendUrl).
// Returns a promise that REJECTS if the email could not be sent, so callers
// that await it can answer with a proper error.
const verifyEmail = async (token, email, frontendUrl, backendUrl) => {
  const base = String(backendUrl || "").replace(/\/+$/, "");
  const link = `${base}/verify-email/${token}`;

  await sendMail({
    to: email,
    subject: "Email Verification",
    text: `Click this link to verify your email: ${link}   ThankYou!`,
    html: `<p>Click this link to verify your email:</p><p><a href="${link}">${link}</a></p><p>Thank you!</p>`,
  });
};

module.exports = verifyEmail;