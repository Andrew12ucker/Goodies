// models/Campaign.js
const mongoose = require('mongoose');

const UpdateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const CommentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isHidden: {
    type: Boolean,
    default: false
  }
});

const RewardTierSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  limitedQuantity: {
    type: Number,
    default: null
  },
  backerCount: {
    type: Number,
    default: 0
  },
  estimatedDelivery: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const CampaignSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 100
  },
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
  description: {
    type: String,
    required: true,
    minlength: 50,
    maxlength: 5000
  },
  category: {
    type: String,
    required: true,
    enum: ['community', 'education', 'health', 'arts', 'environment', 'technology', 'business', 'other']
  },
  
  // Creator Information
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Financial Information
  goal: {
    type: Number,
    required: true,
    min: 100,
    max: 1000000
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  
  // Media
  image: {
    type: String,
    required: true
  },
  video: {
    type: String,
    default: null
  },
  gallery: [{
    url: String,
    caption: String
  }],
  
  // Timeline
  deadline: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  publishedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  
  // Status Management
  status: {
    type: String,
    enum: ['draft', 'pending', 'active', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'draft'
  },
  
  // Engagement Metrics
  backers: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  favorites: {
    type: Number,
    default: 0
  },
  
  // Features
  rewardTiers: [RewardTierSchema],
  updates: [UpdateSchema],
  comments: [CommentSchema],
  
  // FAQ
  faq: [{
    question: String,
    answer: String
  }],
  
  // Location (optional)
  location: {
    country: String,
    state: String,
    city: String
  },
  
  // Verification & Moderation
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isReported: {
    type: Boolean,
    default: false
  },
  reportCount: {
    type: Number,
    default: 0
  },
  
  // Settings
  allowComments: {
    type: Boolean,
    default: true
  },
  allowAnonymousDonations: {
    type: Boolean,
    default: true
  },
  
  // Payout Information
  payoutStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  payoutAmount: {
    type: Number,
    default: 0
  },
  payoutDate: {
    type: Date,
    default: null
  },
  
  // Metadata
  tags: [String],
  lastEditedAt: {
    type: Date,
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
CampaignSchema.index({ creator: 1, status: 1 });
CampaignSchema.index({ status: 1, deadline: 1 });
CampaignSchema.index({ category: 1, status: 1 });
CampaignSchema.index({ slug: 1 });
CampaignSchema.index({ title: 'text', description: 'text' });

// Virtual for progress percentage
CampaignSchema.virtual('progressPercentage').get(function() {
  return Math.min((this.currentAmount / this.goal) * 100, 100);
});

// Virtual for days remaining
CampaignSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const end = new Date(this.deadline);
  const diff = end - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Virtual for is successful
CampaignSchema.virtual('isSuccessful').get(function() {
  return this.currentAmount >= this.goal && this.status === 'completed';
});

// Pre-save hook to generate slug
CampaignSchema.pre('save', async function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    // Ensure uniqueness
    const existingCampaign = await this.constructor.findOne({ slug: this.slug });
    if (existingCampaign) {
      this.slug = `${this.slug}-${Date.now()}`;
    }
  }
  next();
});

// Method to check if campaign is editable
CampaignSchema.methods.isEditable = function() {
  return ['draft', 'pending', 'active', 'paused'].includes(this.status);
};

// Method to check if campaign can be deleted
CampaignSchema.methods.isDeletable = function() {
  return this.status === 'draft' || (this.status === 'active' && this.backers === 0);
};

// Method to check if campaign has ended
CampaignSchema.methods.hasEnded = function() {
  return new Date() > new Date(this.deadline);
};

// Method to check if user can edit
CampaignSchema.methods.canEdit = function(userId) {
  return this.creator.toString() === userId.toString();
};

module.exports = mongoose.model('Campaign', CampaignSchema);