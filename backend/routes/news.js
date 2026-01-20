const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Article = require('../models/Article');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/news/feed
// @desc    Get personalized news feed
// @access  Public (better with auth)
router.get('/feed', optionalAuth, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('category')
    .optional()
    .isIn([
      'technology', 'business', 'science', 'health', 'sports',
      'politics', 'entertainment', 'world', 'local', 'environment',
      'startups', 'ai', 'crypto', 'space', 'culture'
    ])
    .withMessage('Invalid category'),
  query('positivity')
    .optional()
    .isFloat({ min: -1, max: 1 })
    .withMessage('Positivity must be between -1 and 1')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let userPreferences = {
      categories: [],
      positivityThreshold: 0.1,
      languages: ['en']
    };

    // Get user preferences if authenticated
    if (req.user) {
      const user = await User.findById(req.user.userId);
      if (user) {
        userPreferences = user.getNewsPreferences();
      }
    }

    // Override with query parameters
    if (req.query.category) {
      userPreferences.categories = [req.query.category];
    }
    if (req.query.positivity !== undefined) {
      userPreferences.positivityThreshold = parseFloat(req.query.positivity);
    }

    // Build query
    const query = {
      'curation.status': 'approved',
      isActive: true
    };

    // Filter by categories
    if (userPreferences.categories.length > 0) {
      query.categories = { $in: userPreferences.categories };
    }

    // Filter by positivity threshold
    query['aiAnalysis.positivityScore'] = { $gte: userPreferences.positivityThreshold };

    // Filter by language
    if (userPreferences.languages.length > 0) {
      query.language = { $in: userPreferences.languages };
    }

    // Get articles
    const articles = await Article.find(query)
      .sort({ 
        'aiAnalysis.qualityScore': -1, 
        'aiAnalysis.positivityScore': -1, 
        publishedAt: -1 
      })
      .skip(skip)
      .limit(limit)
      .select('title description url source publishedAt aiAnalysis.readingTime aiAnalysis.positivityScore aiAnalysis.qualityScore tags engagement categories');

    // Get total count for pagination
    const total = await Article.countDocuments(query);

    // Update view counts for articles
    const articleIds = articles.map(article => article._id);
    await Article.updateMany(
      { _id: { $in: articleIds } },
      { $inc: { 'engagement.views': 1 } }
    );

    res.json({
      success: true,
      data: {
        articles: articles.map(article => article.getSummary()),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        filters: {
          categories: userPreferences.categories,
          positivityThreshold: userPreferences.positivityThreshold,
          languages: userPreferences.languages
        }
      }
    });

  } catch (error) {
    console.error('Feed fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching news feed'
    });
  }
});

// @route   GET /api/news/trending
// @desc    Get trending articles
// @access  Public
router.get('/trending', [
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

    const limit = parseInt(req.query.limit) || 10;

    const trendingArticles = await Article.getTrending(limit);

    res.json({
      success: true,
      data: {
        articles: trendingArticles.map(article => article.getSummary()),
        count: trendingArticles.length
      }
    });

  } catch (error) {
    console.error('Trending fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching trending articles'
    });
  }
});

// @route   GET /api/news/categories
// @desc    Get available categories with article counts
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Article.aggregate([
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
        categories: categories.map(cat => ({
          name: cat._id,
          count: cat.count,
          avgPositivity: Math.round(cat.avgPositivity * 100) / 100,
          avgQuality: Math.round(cat.avgQuality * 100) / 100
        }))
      }
    });

  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching categories'
    });
  }
});

// @route   GET /api/news/sources
// @desc    Get available news sources
// @access  Public
router.get('/sources', async (req, res) => {
  try {
    const sources = await Article.aggregate([
      {
        $match: {
          'curation.status': 'approved',
          isActive: true
        }
      },
      {
        $group: {
          _id: {
            name: '$source.name',
            category: '$source.category'
          },
          count: { $sum: 1 },
          avgPositivity: { $avg: '$aiAnalysis.positivityScore' },
          avgQuality: { $avg: '$aiAnalysis.qualityScore' },
          reliability: { $avg: '$source.reliability' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        sources: sources.map(source => ({
          name: source._id.name,
          category: source._id.category,
          count: source.count,
          avgPositivity: Math.round(source.avgPositivity * 100) / 100,
          avgQuality: Math.round(source.avgQuality * 100) / 100,
          reliability: Math.round(source.reliability * 100) / 100
        }))
      }
    });

  } catch (error) {
    console.error('Sources fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching sources'
    });
  }
});

// @route   GET /api/news/article/:id
// @desc    Get single article details
// @access  Public
router.get('/article/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article || !article.isActive || article.curation.status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Record view
    await article.recordView();

    res.json({
      success: true,
      data: {
        article: {
          id: article._id,
          title: article.title,
          description: article.description,
          content: article.content,
          url: article.url,
          source: article.source,
          author: article.author,
          publishedAt: article.publishedAt,
          language: article.language,
          tags: article.tags,
          categories: article.categories,
          aiAnalysis: article.aiAnalysis,
          engagement: article.engagement,
          metadata: article.metadata
        }
      }
    });

  } catch (error) {
    console.error('Article fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching article'
    });
  }
});

// @route   POST /api/news/read/:id
// @desc    Record article read with reading time
// @access  Private
router.post('/read/:id', auth, [
  body('readingTime')
    .isInt({ min: 1 })
    .withMessage('Reading time must be a positive integer (seconds)')
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

    const { readingTime } = req.body;
    const article = await Article.findById(req.params.id);

    if (!article || !article.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Record read for article
    await article.recordRead(readingTime);

    // Update user analytics
    const user = await User.findById(req.user.userId);
    if (user) {
      const category = article.categories[0] || 'general';
      await user.updateReadingStats(category, readingTime);
    }

    res.json({
      success: true,
      message: 'Reading activity recorded',
      data: {
        readingTime,
        totalReads: article.engagement.reads,
        avgReadingTime: article.engagement.averageReadingTime
      }
    });

  } catch (error) {
    console.error('Read tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error recording read'
    });
  }
});

// @route   GET /api/news/search
// @desc    Search articles
// @access  Public
router.get('/search', [
  query('q')
    .notEmpty()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
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

    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Create text search query
    const searchQuery = {
      $and: [
        {
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { tags: { $in: [new RegExp(q, 'i')] } },
            { 'aiAnalysis.keywords': { $in: [new RegExp(q, 'i')] } }
          ]
        },
        {
          'curation.status': 'approved',
          isActive: true
        }
      ]
    };

    const articles = await Article.find(searchQuery)
      .sort({ 'aiAnalysis.qualityScore': -1, publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('title description url source publishedAt aiAnalysis.readingTime aiAnalysis.positivityScore tags categories');

    const total = await Article.countDocuments(searchQuery);

    res.json({
      success: true,
      data: {
        articles: articles.map(article => article.getSummary()),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        query: q
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during search'
    });
  }
});

module.exports = router;