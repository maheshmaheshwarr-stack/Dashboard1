const express = require('express');
const { body, query, validationResult } = require('express-validator');
const AIProcessor = require('../services/aiProcessor');
const NewsScraper = require('../services/newsScraper');
const Article = require('../models/Article');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();
const aiProcessor = new AIProcessor();
const newsScraper = new NewsScraper();

// @route   POST /api/ai/analyze
// @desc    Analyze text content with AI
// @access  Public
router.post('/analyze', [
  body('title')
    .notEmpty()
    .withMessage('Title is required'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('content')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Content must be less than 10000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, description = '', content = '' } = req.body;

    // Run AI analysis
    const analysis = aiProcessor.analyzeSentiment(title, description, content);
    const category = aiProcessor.classifyCategory(title, description, content);

    res.json({
      success: true,
      data: {
        analysis,
        category,
        processedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'AI analysis failed'
    });
  }
});

// @route   GET /api/ai/curated-feed
// @desc    Get AI-curated news feed
// @access  Public (better with auth for personalization)
router.get('/curated-feed', optionalAuth, [
  query('positivity')
    .optional()
    .isFloat({ min: -1, max: 1 })
    .withMessage('Positivity must be between -1 and 1'),
  query('quality')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Quality must be between 0 and 1'),
  query('category')
    .optional()
    .isIn(['technology', 'business', 'science', 'health', 'sports', 'politics', 'world', 'local', 'culture'])
    .withMessage('Invalid category'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const positivityThreshold = parseFloat(req.query.positivity) || 0.1;
    const qualityThreshold = parseFloat(req.query.quality) || 0.3;
    const category = req.query.category;
    const limit = parseInt(req.query.limit) || 20;

    // Get user preferences if authenticated
    let userPreferences = {
      positivityThreshold,
      categories: category ? [category] : [],
      languages: ['en']
    };

    if (req.user) {
      const User = require('../models/User');
      const user = await User.findById(req.user.userId);
      if (user) {
        userPreferences = {
          ...userPreferences,
          ...user.getNewsPreferences()
        };
      }
    }

    // Get curated articles
    const articles = await newsScraper.getFilteredArticles({
      category,
      positivityThreshold,
      qualityThreshold,
      limit,
      sortBy: 'quality'
    });

    // Generate personalized recommendations if user is logged in
    let recommendations = [];
    if (req.user && articles.length > 0) {
      recommendations = aiProcessor.generateRecommendations(
        userPreferences,
        articles,
        5
      );
    }

    res.json({
      success: true,
      data: {
        articles: articles.map(article => ({
          id: article._id || article.url,
          title: article.title,
          description: article.description,
          url: article.url,
          source: article.source,
          publishedAt: article.publishedAt,
          categories: article.categories,
          aiAnalysis: {
            positivityScore: article.aiAnalysis.positivityScore,
            qualityScore: article.aiAnalysis.qualityScore,
            constructivenessScore: article.aiAnalysis.constructivenessScore,
            readingTime: article.aiAnalysis.readingTime,
            keywords: article.aiAnalysis.keywords.slice(0, 5)
          },
          curation: {
            status: article.curation.status,
            priority: article.curation.priority
          }
        })),
        recommendations: recommendations.map(article => ({
          id: article._id || article.url,
          title: article.title,
          reason: 'Based on your preferences'
        })),
        filters: {
          positivityThreshold,
          qualityThreshold,
          category,
          appliedPreferences: userPreferences
        },
        meta: {
          totalArticles: articles.length,
          avgPositivity: articles.length > 0 
            ? Math.round((articles.reduce((sum, a) => sum + a.aiAnalysis.positivityScore, 0) / articles.length) * 100) / 100
            : 0,
          avgQuality: articles.length > 0
            ? Math.round((articles.reduce((sum, a) => sum + a.aiAnalysis.qualityScore, 0) / articles.length) * 100) / 100
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Curated feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate curated feed'
    });
  }
});

// @route   GET /api/ai/trending-topics
// @desc    Get AI-identified trending topics
// @access  Public
router.get('/trending-topics', [
  query('timeframe')
    .optional()
    .isIn(['1h', '6h', '24h', '7d'])
    .withMessage('Invalid timeframe'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const timeframe = req.query.timeframe || '24h';
    const limit = parseInt(req.query.limit) || 10;

    const trendingTopics = await newsScraper.getTrendingTopics(timeframe);

    res.json({
      success: true,
      data: {
        topics: trendingTopics.slice(0, limit),
        timeframe,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Trending topics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trending topics'
    });
  }
});

// @route   GET /api/ai/daily-digest
// @desc    Generate AI-curated daily digest
// @access  Private
router.get('/daily-digest', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userPreferences = user.getNewsPreferences();
    const digest = await newsScraper.generateDailyDigest(userPreferences);

    res.json({
      success: true,
      data: {
        digest,
        userPreferences,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Daily digest error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate daily digest'
    });
  }
});

// @route   POST /api/ai/scrape-news
// @desc    Manually trigger news scraping (Admin only)
// @access  Private (Admin)
router.post('/scrape-news', auth, async (req, res) => {
  try {
    // Check if user is admin
    const User = require('../models/User');
    const user = await User.findById(req.user.userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Start scraping process
    const articles = await newsScraper.scrapeAllSources();
    
    // Save articles to database
    let savedCount = 0;
    let skippedCount = 0;

    for (const articleData of articles) {
      try {
        // Check if article already exists
        const existingArticle = await Article.findOne({ url: articleData.url });
        
        if (!existingArticle) {
          const article = new Article(articleData);
          await article.save();
          savedCount++;
        } else {
          skippedCount++;
        }
      } catch (saveError) {
        console.error('Error saving article:', saveError.message);
        skippedCount++;
      }
    }

    res.json({
      success: true,
      data: {
        totalScraped: articles.length,
        savedCount,
        skippedCount,
        sources: newsScraper.sources.length,
        scrapedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('News scraping error:', error);
    res.status(500).json({
      success: false,
      message: 'News scraping failed'
    });
  }
});

// @route   GET /api/ai/sentiment-stats
// @desc    Get sentiment analysis statistics
// @access  Public
router.get('/sentiment-stats', async (req, res) => {
  try {
    const stats = await Article.aggregate([
      {
        $match: {
          'curation.status': 'approved',
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          totalArticles: { $sum: 1 },
          avgPositivity: { $avg: '$aiAnalysis.positivityScore' },
          avgQuality: { $avg: '$aiAnalysis.qualityScore' },
          avgConstructiveness: { $avg: '$aiAnalysis.constructivenessScore' },
          positiveArticles: {
            $sum: {
              $cond: [{ $gte: ['$aiAnalysis.positivityScore', 0.6] }, 1, 0]
            }
          },
          highQualityArticles: {
            $sum: {
              $cond: [{ $gte: ['$aiAnalysis.qualityScore', 0.7] }, 1, 0]
            }
          }
        }
      }
    ]);

    const categoryStats = await Article.aggregate([
      {
        $match: {
          'curation.status': 'approved',
          isActive: true
        }
      },
      {
        $unwind: '$categories'
      },
      {
        $group: {
          _id: '$categories',
          count: { $sum: 1 },
          avgPositivity: { $avg: '$aiAnalysis.positivityScore' },
          avgQuality: { $avg: '$aiAnalysis.qualityScore' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        overall: stats[0] || {
          totalArticles: 0,
          avgPositivity: 0,
          avgQuality: 0,
          avgConstructiveness: 0,
          positiveArticles: 0,
          highQualityArticles: 0
        },
        byCategory: categoryStats.map(cat => ({
          category: cat._id,
          count: cat.count,
          avgPositivity: Math.round(cat.avgPositivity * 100) / 100,
          avgQuality: Math.round(cat.avgQuality * 100) / 100
        })),
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Sentiment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sentiment statistics'
    });
  }
});

// @route   POST /api/ai/feedback
// @desc    Submit feedback on AI curation
// @access  Private
router.post('/feedback', auth, [
  body('articleId')
    .notEmpty()
    .withMessage('Article ID is required'),
  body('feedback')
    .isIn(['helpful', 'not_helpful', 'too_positive', 'too_negative', 'low_quality'])
    .withMessage('Invalid feedback type'),
  body('comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Comment must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { articleId, feedback, comment } = req.body;

    // Find the article
    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Store feedback (you might want to create a separate Feedback model)
    const feedbackData = {
      userId: req.user.userId,
      articleId,
      feedback,
      comment,
      createdAt: new Date()
    };

    // For now, we'll just log it (implement proper storage later)
    console.log('AI Feedback received:', feedbackData);

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        feedbackId: Date.now(), // Temporary ID
        submittedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback'
    });
  }
});

module.exports = router;