const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profile: {
    firstName: String,
    lastName: String,
    avatar: String,
    bio: String,
    location: String,
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  preferences: {
    categories: [{
      type: String,
      enum: [
        'technology', 'business', 'science', 'health', 'sports',
        'politics', 'entertainment', 'world', 'local', 'environment',
        'startups', 'ai', 'crypto', 'space', 'culture'
      ]
    }],
    sources: [String],
    languages: [{
      type: String,
      default: 'en'
    }],
    positivityThreshold: {
      type: Number,
      default: 0.1,
      min: -1,
      max: 1
    },
    digestFrequency: {
      type: String,
      enum: ['realtime', 'hourly', 'daily', 'weekly'],
      default: 'daily'
    },
    emailNotifications: {
      type: Boolean,
      default: true
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium', 'enterprise'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    features: [String]
  },
  analytics: {
    totalReads: {
      type: Number,
      default: 0
    },
    readingTime: {
      type: Number,
      default: 0
    },
    favoriteCategories: [String],
    lastActive: Date,
    sessionCount: {
      type: Number,
      default: 0
    }
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'preferences.categories': 1 });
userSchema.index({ lastLogin: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update updatedAt on save
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get user's reading statistics
userSchema.methods.getReadingStats = function() {
  return {
    totalReads: this.analytics.totalReads,
    readingTime: this.analytics.readingTime,
    averageReadingTime: this.analytics.totalReads > 0 
      ? Math.round(this.analytics.readingTime / this.analytics.totalReads) 
      : 0,
    favoriteCategories: this.analytics.favoriteCategories,
    sessionCount: this.analytics.sessionCount
  };
};

// Update reading analytics
userSchema.methods.updateReadingStats = function(category, readingTime) {
  this.analytics.totalReads += 1;
  this.analytics.readingTime += readingTime;
  this.analytics.lastActive = new Date();
  
  // Update favorite categories
  if (category && !this.analytics.favoriteCategories.includes(category)) {
    this.analytics.favoriteCategories.push(category);
  }
  
  return this.save();
};

// Get personalized news preferences
userSchema.methods.getNewsPreferences = function() {
  return {
    categories: this.preferences.categories,
    sources: this.preferences.sources,
    languages: this.preferences.languages,
    positivityThreshold: this.preferences.positivityThreshold,
    excludeNegative: this.preferences.positivityThreshold > 0
  };
};

// Check if user has premium features
userSchema.methods.hasPremiumAccess = function() {
  return this.subscription.plan !== 'free' && 
         this.subscription.endDate && 
         this.subscription.endDate > new Date();
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);