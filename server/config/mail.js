// ------------------------------------------------------------
// 📧 mail.js — Goodies Mail Transport (Nodemailer)
// ------------------------------------------------------------
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function sendMail({ to, subject, html }) {
  if (!to || !subject || !html) {
    console.error("❌ Missing mail fields (to, subject, html).");
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Goodies" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📨 Email sent to ${to}`);
  } catch (err) {
    console.error("❌ Error sending email:", err);
  }
}

module.exports = sendMail;
