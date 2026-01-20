const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  content: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true,
    unique: true
  },
  source: {
    name: {
      type: String,
      required: true
    },
    url: String,
    category: {
      type: String,
      enum: [
        'technology', 'business', 'science', 'health', 'sports',
        'politics', 'entertainment', 'world', 'local', 'environment',
        'startups', 'ai', 'crypto', 'space', 'culture'
      ]
    },
    reliability: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    }
  },
  author: {
    name: String,
    email: String
  },
  publishedAt: {
    type: Date,
    required: true
  },
  scrapedAt: {
    type: Date,
    default: Date.now
  },
  language: {
    type: String,
    default: 'en'
  },
  tags: [String],
  categories: [{
    type: String,
    enum: [
      'technology', 'business', 'science', 'health', 'sports',
      'politics', 'entertainment', 'world', 'local', 'environment',
      'startups', 'ai', 'crypto', 'space', 'culture'
    ]
  }],
  
  // AI Analysis
  aiAnalysis: {
    sentimentScore: {
      type: Number,
      min: -1,
      max: 1,
      default: 0
    },
    positivityScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    constructivenessScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    urgencyScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    keywords: [String],
    entities: [{
      name: String,
      type: String, // PERSON, ORGANIZATION, LOCATION, etc.
      confidence: Number
    }],
    topics: [String],
    readingTime: {
      type: Number, // in minutes
      default: 0
    },
    complexity: {
      type: String,
      enum: ['simple', 'moderate', 'complex'],
      default: 'moderate'
    }
  },
  
  // Engagement Metrics
  engagement: {
    views: {
      type: Number,
      default: 0
    },
    reads: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    bookmarks: {
      type: Number,
      default: 0
    },
    averageReadingTime: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    }
  },
  
  // Content Metadata
  metadata: {
    wordCount: Number,
    imageCount: Number,
    videoCount: Number,
    hasPaywall: {
      type: Boolean,
      default: false
    },
    isBreaking: {
      type: Boolean,
      default: false
    },
    isOpinion: {
      type: Boolean,
      default: false
    },
    isSponsored: {
      type: Boolean,
      default: false
    }
  },
  
  // Curation Status
  curation: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'featured'],
      default: 'pending'
    },
    curatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    curatedAt: Date,
    reason: String,
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
articleSchema.index({ url: 1 });
articleSchema.index({ publishedAt: -1 });
articleSchema.index({ 'source.category': 1 });
articleSchema.index({ categories: 1 });
articleSchema.index({ 'aiAnalysis.positivityScore': -1 });
articleSchema.index({ 'aiAnalysis.qualityScore': -1 });
articleSchema.index({ 'curation.status': 1 });
articleSchema.index({ 'engagement.views': -1 });
articleSchema.index({ createdAt: -1 });

// Compound indexes
articleSchema.index({ 
  'curation.status': 1, 
  'aiAnalysis.positivityScore': -1, 
  publishedAt: -1 
});

// Update updatedAt on save
articleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Calculate reading time based on word count
articleSchema.methods.calculateReadingTime = function() {
  const wordsPerMinute = 200;
  const wordCount = this.metadata.wordCount || this.content.split(' ').length;
  this.aiAnalysis.readingTime = Math.ceil(wordCount / wordsPerMinute);
  return this.aiAnalysis.readingTime;
};

// Get article summary for API responses
articleSchema.methods.getSummary = function() {
  return {
    id: this._id,
    title: this.title,
    description: this.description,
    url: this.url,
    source: this.source.name,
    category: this.source.category,
    publishedAt: this.publishedAt,
    readingTime: this.aiAnalysis.readingTime,
    positivityScore: this.aiAnalysis.positivityScore,
    qualityScore: this.aiAnalysis.qualityScore,
    tags: this.tags,
    engagement: {
      views: this.engagement.views,
      reads: this.engagement.reads
    }
  };
};

// Check if article meets positivity threshold
articleSchema.methods.meetsPositivityThreshold = function(threshold = 0.1) {
  return this.aiAnalysis.positivityScore >= threshold;
};

// Update engagement metrics
articleSchema.methods.recordView = function() {
  this.engagement.views += 1;
  return this.save();
};

articleSchema.methods.recordRead = function(readingTime) {
  this.engagement.reads += 1;
  
  // Update average reading time
  const totalTime = this.engagement.averageReadingTime * (this.engagement.reads - 1) + readingTime;
  this.engagement.averageReadingTime = totalTime / this.engagement.reads;
  
  // Calculate completion rate
  if (this.aiAnalysis.readingTime > 0) {
    this.engagement.completionRate = Math.min(readingTime / (this.aiAnalysis.readingTime * 60), 1);
  }
  
  return this.save();
};

// Static method to get trending articles
articleSchema.statics.getTrending = function(limit = 10) {
  return this.find({ 
    'curation.status': 'approved',
    isActive: true,
    publishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
  })
  .sort({ 'engagement.views': -1, 'aiAnalysis.qualityScore': -1 })
  .limit(limit);
};

// Static method to get personalized feed
articleSchema.statics.getPersonalizedFeed = function(userPreferences, limit = 20) {
  const query = {
    'curation.status': 'approved',
    isActive: true
  };
  
  // Filter by categories if specified
  if (userPreferences.categories && userPreferences.categories.length > 0) {
    query.categories = { $in: userPreferences.categories };
  }
  
  // Filter by positivity threshold
  if (userPreferences.positivityThreshold !== undefined) {
    query['aiAnalysis.positivityScore'] = { $gte: userPreferences.positivityThreshold };
  }
  
  // Filter by language
  if (userPreferences.languages && userPreferences.languages.length > 0) {
    query.language = { $in: userPreferences.languages };
  }
  
  return this.find(query)
    .sort({ 
      'aiAnalysis.qualityScore': -1, 
      'aiAnalysis.positivityScore': -1, 
      publishedAt: -1 
    })
    .limit(limit);
};

module.exports = mongoose.model('Article', articleSchema);