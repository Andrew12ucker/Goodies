// models/Donation.js
const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    // Core Fields
    amount: { 
      type: Number, 
      required: true,
      min: 1
    },
    donor: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: true
    },
    campaign: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Campaign",
      required: true,
      index: true
    },
    
    // Payment Information
    paymentMethod: { 
      type: String, 
      enum: ["Stripe", "PayPal"], 
      default: "Stripe" 
    },
    status: { 
      type: String, 
      enum: ["pending", "completed", "failed", "refunded"], 
      default: "pending",
      index: true
    },
    providerSessionId: { 
      type: String,
      unique: true,
      sparse: true
    },
    providerPaymentId: {
      type: String
    },
    
    // Campaign Management System - Additional Fields
    message: {
      type: String,
      maxlength: 500,
      default: ''
    },
    anonymous: {
      type: Boolean,
      default: false
    },
    donorName: {
      type: String,
      trim: true
    },
    donorEmail: {
      type: String,
      lowercase: true,
      trim: true
    },
    
    // Reward Tier (if applicable)
    rewardTier: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    
    // Transaction Details
    currency: {
      type: String,
      default: 'USD'
    },
    fees: {
      platformFee: {
        type: Number,
        default: 0
      },
      processingFee: {
        type: Number,
        default: 0
      },
      totalFees: {
        type: Number,
        default: 0
      }
    },
    netAmount: {
      type: Number,
      default: 0
    },
    
    // Refund Information
    refundReason: String,
    refundedAt: Date,
    refundAmount: Number,
    
    // Metadata
    ipAddress: String,
    userAgent: String,
    
    // Receipts & Notifications
    receiptSent: {
      type: Boolean,
      default: false
    },
    receiptSentAt: Date,
    
    // Campaign snapshot (for historical data)
    campaignSnapshot: {
      title: String,
      creatorName: String,
      creatorId: mongoose.Schema.Types.ObjectId
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
donationSchema.index({ campaign: 1, status: 1 });
donationSchema.index({ donor: 1, createdAt: -1 });
donationSchema.index({ status: 1, createdAt: -1 });
donationSchema.index({ providerSessionId: 1 });

// Virtual for donor display name
donationSchema.virtual('displayName').get(function() {
  if (this.anonymous) return 'Anonymous';
  return this.donorName || 'Anonymous';
});

// Pre-save hook - Calculate net amount
donationSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('fees')) {
    const totalFees = (this.fees?.platformFee || 0) + (this.fees?.processingFee || 0);
    this.fees.totalFees = totalFees;
    this.netAmount = this.amount - totalFees;
  }
  next();
});

// Pre-save hook - Set donor info from User if not anonymous
donationSchema.pre('save', async function(next) {
  if (this.isNew && this.donor && !this.donorName) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(this.donor).select('name email');
      if (user && !this.anonymous) {
        this.donorName = user.name;
        this.donorEmail = user.email;
      }
    } catch (error) {
      console.error('Error fetching donor info:', error);
    }
  }
  next();
});

// Post-save hook - Update campaign statistics
donationSchema.post('save', async function(doc) {
  // Only update if donation is completed
  if (doc.status === 'completed') {
    try {
      const Campaign = mongoose.model('Campaign');
      const campaign = await Campaign.findById(doc.campaign);
      
      if (campaign) {
        // Increment current amount and backers
        campaign.currentAmount = (campaign.currentAmount || 0) + doc.amount;
        campaign.backers = (campaign.backers || 0) + 1;
        
        await campaign.save();
        console.log(`✅ Campaign ${campaign._id} stats updated: +$${doc.amount}, backers: ${campaign.backers}`);
      }
    } catch (error) {
      console.error('Error updating campaign stats:', error);
      // Don't throw - donation is already saved
    }
  }
});

// Post-save hook - Update user statistics
donationSchema.post('save', async function(doc) {
  if (doc.status === 'completed' && doc.donor) {
    try {
      const User = mongoose.model('User');
      await User.findByIdAndUpdate(doc.donor, {
        $inc: {
          totalCampaignsBacked: 1,
          totalAmountDonated: doc.amount
        }
      });
      console.log(`✅ User ${doc.donor} stats updated: +$${doc.amount}`);
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  }
});

// Post-findOneAndUpdate hook - Handle refunds
donationSchema.post('findOneAndUpdate', async function(doc) {
  if (doc && doc.status === 'refunded') {
    try {
      const Campaign = mongoose.model('Campaign');
      const campaign = await Campaign.findById(doc.campaign);
      
      if (campaign) {
        // Decrease current amount and backers
        campaign.currentAmount = Math.max(0, (campaign.currentAmount || 0) - doc.amount);
        campaign.backers = Math.max(0, (campaign.backers || 0) - 1);
        
        await campaign.save();
        console.log(`✅ Campaign ${campaign._id} refund processed: -$${doc.amount}`);
      }
    } catch (error) {
      console.error('Error processing refund:', error);
    }
  }
});

// Method - Check if donation can be refunded
donationSchema.methods.canRefund = function() {
  // Can refund if:
  // 1. Status is completed
  // 2. Not already refunded
  // 3. Created within last 30 days (configurable)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.status === 'completed' && 
         this.createdAt > thirtyDaysAgo;
};

// Method - Process refund
donationSchema.methods.processRefund = async function(reason) {
  if (!this.canRefund()) {
    throw new Error('This donation cannot be refunded');
  }
  
  this.status = 'refunded';
  this.refundReason = reason;
  this.refundedAt = new Date();
  this.refundAmount = this.amount;
  
  return this.save();
};

// Method - Mark receipt as sent
donationSchema.methods.markReceiptSent = async function() {
  this.receiptSent = true;
  this.receiptSentAt = new Date();
  return this.save();
};

// Static method - Get donations by campaign
donationSchema.statics.findByCampaign = function(campaignId, options = {}) {
  const query = this.find({ campaign: campaignId, status: 'completed' })
    .populate('donor', 'name email profilePicture')
    .sort({ createdAt: -1 });
  
  if (options.limit) query.limit(options.limit);
  if (options.skip) query.skip(options.skip);
  
  return query;
};

// Static method - Get donations by user
donationSchema.statics.findByDonor = function(userId, options = {}) {
  const query = this.find({ donor: userId })
    .populate('campaign', 'title image goal currentAmount')
    .sort({ createdAt: -1 });
  
  if (options.limit) query.limit(options.limit);
  if (options.skip) query.skip(options.skip);
  
  return query;
};

// Static method - Calculate campaign total
donationSchema.statics.getCampaignTotal = async function(campaignId) {
  const result = await this.aggregate([
    { $match: { campaign: mongoose.Types.ObjectId(campaignId), status: 'completed' } },
    { $group: { 
      _id: null, 
      total: { $sum: '$amount' },
      count: { $sum: 1 }
    }}
  ]);
  
  return result[0] || { total: 0, count: 0 };
};

// Static method - Get recent donations (for public display)
donationSchema.statics.getRecent = function(campaignId, limit = 5) {
  return this.find({ 
    campaign: campaignId, 
    status: 'completed' 
  })
  .select('amount donorName anonymous message createdAt')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method - Get donation statistics
donationSchema.statics.getStats = async function(campaignId) {
  const stats = await this.aggregate([
    { $match: { campaign: mongoose.Types.ObjectId(campaignId), status: 'completed' } },
    { 
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalDonations: { $sum: 1 },
        averageDonation: { $avg: '$amount' },
        largestDonation: { $max: '$amount' },
        smallestDonation: { $min: '$amount' }
      }
    }
  ]);
  
  return stats[0] || {
    totalAmount: 0,
    totalDonations: 0,
    averageDonation: 0,
    largestDonation: 0,
    smallestDonation: 0
  };
};

module.exports = mongoose.models.Donation || mongoose.model("Donation", donationSchema);