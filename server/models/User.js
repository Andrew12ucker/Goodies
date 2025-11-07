// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    password: { 
      type: String, 
      required: true 
    },
    name: { 
      type: String,
      required: true,
      trim: true
    },
    role: { 
      type: String, 
      enum: ["user", "admin"], 
      default: "user" 
    },
    provider: { 
      type: String 
    }, // google, apple, facebook
    providerId: { 
      type: String 
    },
    
    // Campaign Management System - Required Fields
    profilePicture: {
      type: String,
      default: '/assets/default-avatar.png'
    },
    bio: {
      type: String,
      maxlength: 500,
      default: ''
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    
    // Optional - Enhanced User Features
    phone: {
      type: String,
      default: ''
    },
    location: {
      country: String,
      state: String,
      city: String
    },
    socialLinks: {
      twitter: String,
      linkedin: String,
      facebook: String,
      website: String
    },
    
    // Verification & Security
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    isPhoneVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    // User Preferences
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      campaignUpdates: {
        type: Boolean,
        default: true
      },
      newDonations: {
        type: Boolean,
        default: true
      },
      marketing: {
        type: Boolean,
        default: false
      }
    },
    
    // Account Status
    isActive: {
      type: Boolean,
      default: true
    },
    isBanned: {
      type: Boolean,
      default: false
    },
    bannedReason: String,
    bannedAt: Date,
    lastLoginAt: Date,
    
    // Statistics (optional - for dashboard)
    totalCampaignsCreated: {
      type: Number,
      default: 0
    },
    totalCampaignsBacked: {
      type: Number,
      default: 0
    },
    totalAmountDonated: {
      type: Number,
      default: 0
    },
    totalAmountRaised: {
      type: Number,
      default: 0
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ provider: 1, providerId: 1 });
UserSchema.index({ isAdmin: 1 });

// Virtual for full role check (admin via role or isAdmin flag)
UserSchema.virtual('isAdminUser').get(function() {
  return this.role === 'admin' || this.isAdmin === true;
});

// Pre-save hook - Hash password before saving
UserSchema.pre("save", async function (next) {
  // Only hash if password is modified
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save hook - Sync role and isAdmin
UserSchema.pre("save", function(next) {
  // Keep role and isAdmin in sync
  if (this.role === 'admin') {
    this.isAdmin = true;
  }
  if (this.isAdmin === true && this.role !== 'admin') {
    this.role = 'admin';
  }
  next();
});

// Method - Compare entered password with hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Method - Check if user is admin
UserSchema.methods.checkIsAdmin = function() {
  return this.role === 'admin' || this.isAdmin === true;
};

// Method - Update last login time
UserSchema.methods.updateLastLogin = async function() {
  this.lastLoginAt = new Date();
  return this.save();
};

// Method - Generate safe user object (without password)
UserSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

// Static method - Find by email
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

// Static method - Find admins
UserSchema.statics.findAdmins = function() {
  return this.find({ $or: [{ role: 'admin' }, { isAdmin: true }] });
};

module.exports = mongoose.model("User", UserSchema);