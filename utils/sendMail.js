require('dotenv').config();

// Sends transactional email over HTTPS (Brevo API) instead of SMTP.
// Render's free tier blocks outbound SMTP ports, so nodemailer/Gmail cannot work there.
//
// Required environment variables (set them in Render, never commit them):
//   BREVO_API_KEY     API key from the Brevo dashboard
//   MAIL_FROM_EMAIL   a sender address you have verified in Brevo
// Optional:
//   MAIL_FROM_NAME    display name (default "AKA WMart")

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const TIMEOUT_MS = 10000; // fail fast instead of hanging the request

const sendMail = async ({ to, subject, html, text }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.EMAIL_USER;

  if (!apiKey || !fromEmail) {
    throw new Error("Mail is not configured (BREVO_API_KEY / MAIL_FROM_EMAIL missing)");
  }

  let response;
  try {
    response = await fetch(BREVO_URL, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: process.env.MAIL_FROM_NAME || "AKA WMart" },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    // network error or timeout
    console.error("[mail] request failed:", error.name, error.message);
    throw new Error("Email service unreachable");
  }

  if (!response.ok) {
    // Log provider status and message only; never the API key, OTP or token.
    const detail = await response.text().catch(() => "");
    console.error("[mail] provider rejected the message:", response.status, detail.slice(0, 300));
    throw new Error("Email service rejected the message");
  }

  return true;
};

module.exports = sendMail;