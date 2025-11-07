// server/controllers/donationController.js
// Placeholder logic until real DB + Stripe logic is wired

exports.createDonation = async (req, res) => {
  try {
    const { amount, campaignId, donorName, email, paymentMethod } = req.body;

    if (!amount || !campaignId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Example: Save donation to database (replace with Mongo schema)
    const donation = {
      id: Date.now(),
      amount,
      campaignId,
      donorName,
      email,
      paymentMethod,
      status: 'success',
    };

    console.log('💸 Donation received:', donation);
    res.status(201).json({ message: 'Donation created successfully', donation });
  } catch (err) {
    console.error('createDonation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getDonations = async (req, res) => {
  try {
    // Placeholder: return an empty array until DB logic is added
    const donations = [];
    res.status(200).json(donations);
  } catch (err) {
    console.error('getDonations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
