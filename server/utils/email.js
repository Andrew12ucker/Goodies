const nodemailer = require('nodemailer');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

async function sendVerificationEmail(toEmail, token) {
  const verifyUrl = `${FRONTEND_URL}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(
    toEmail
  )}`;

  // If SMTP is configured, send an actual email. Otherwise log the link.
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || `no-reply@${process.env.SMTP_HOST}`,
      to: toEmail,
      subject: 'Please verify your email',
      html: `<p>Welcome — please verify your email by clicking the link below:</p>
             <p><a href="${verifyUrl}">Verify email</a></p>
             <p>If the link doesn't work, copy-paste this URL into your browser:</p>
             <pre>${verifyUrl}</pre>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return info;
  }

  // Fallback for local development: print link to console
  console.log('SMTP not configured, verification link:', verifyUrl);
  return { preview: verifyUrl };
}

module.exports = { sendVerificationEmail };
