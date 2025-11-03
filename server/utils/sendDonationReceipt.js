// ------------------------------------------------------------
// 💌 sendDonationReceipt.js — Goodies Donation Receipt Mailer
// ------------------------------------------------------------

const sendMail = require("../config/mail");

/**
 * Sends a fully branded donation receipt to the donor.
 *
 * @param {string} userEmail - Recipient email address.
 * @param {object} donation - Donation data.
 * @param {string} donation.campaignTitle - Campaign name.
 * @param {number} donation.amount - Donation amount in USD.
 * @param {Date} donation.createdAt - Date of donation.
 * @param {string} [donation.transactionId] - Payment provider session/order ID.
 */
async function sendDonationReceipt(userEmail, donation) {
  try {
    if (!userEmail || !donation)
      throw new Error("Missing email or donation data.");

    const formattedDate = new Date(donation.createdAt).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Your Goodies Donation Receipt</title>
        <style>
          body {
            font-family: 'Montserrat', Arial, sans-serif;
            background-color: #f9f9fb;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .wrapper {
            max-width: 600px;
            margin: 40px auto;
            background: #fff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .header {
            background: #121212;
            color: #fff;
            text-align: center;
            padding: 30px 20px;
          }
          .header img {
            max-width: 120px;
            margin-bottom: 10px;
          }
          .content {
            padding: 30px;
            text-align: left;
          }
          h1 {
            font-size: 22px;
            color: #121212;
            margin-bottom: 20px;
          }
          .details {
            background: #f4f4f8;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .details p {
            margin: 8px 0;
            font-size: 15px;
          }
          .footer {
            background: #121212;
            color: #ccc;
            text-align: center;
            font-size: 13px;
            padding: 15px;
          }
          .footer a {
            color: #ccc;
            text-decoration: underline;
          }
          .highlight {
            color: #2ecc71;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <img src="${process.env.CLIENT_URL}/assets/logo.png" alt="Goodies Logo" />
            <h2>Goodies Donation Receipt</h2>
          </div>
          <div class="content">
            <h1>Thank you for your generous donation!</h1>
            <p>Your support helps <strong>${donation.campaignTitle}</strong> make a greater impact.</p>
            <div class="details">
              <p><strong>Campaign:</strong> ${donation.campaignTitle}</p>
              <p><strong>Amount:</strong> <span class="highlight">$${Number(donation.amount).toFixed(2)}</span></p>
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Transaction ID:</strong> ${donation.transactionId || "Pending"}</p>
            </div>
            <p>
              Your contribution is truly appreciated — every donation helps build our community stronger.  
              You can review your donation history anytime from your <a href="${process.env.CLIENT_URL}/dashboard">Goodies Dashboard</a>.
            </p>
          </div>
          <div class="footer">
            <p>Goodies ® — Building through community.</p>
            <p><a href="${process.env.CLIENT_URL}">${process.env.CLIENT_URL}</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendMail({
      to: userEmail,
      subject: "Your Goodies Donation Receipt",
      html: htmlContent,
    });

    console.log(`📩 Donation receipt sent to ${userEmail}`);
  } catch (err) {
    console.error("❌ Failed to send donation receipt:", err);
  }
}

module.exports = sendDonationReceipt;
