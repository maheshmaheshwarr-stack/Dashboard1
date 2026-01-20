const cron = require('node-cron');
const NewsScraper = require('./newsScraper');
const Article = require('../models/Article');

class SchedulerService {
  constructor() {
    this.newsScraper = new NewsScraper();
    this.isRunning = false;
  }

  /**
   * Start all scheduled tasks
   */
  start() {
    console.log('🕐 Starting scheduled tasks...');

    // Scrape news every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      if (!this.isRunning) {
        await this.scrapeAndProcessNews();
      }
    });

    // Clean up old articles daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldArticles();
    });

    // Generate daily analytics at 1 AM
    cron.schedule('0 1 * * *', async () => {
      await this.generateDailyAnalytics();
    });

    // Update trending topics every hour
    cron.schedule('0 * * * *', async () => {
      await this.updateTrendingTopics();
    });

    console.log('✅ Scheduled tasks started successfully');
  }

  /**
   * Scrape and process news articles
   */
  async scrapeAndProcessNews() {
    try {
      this.isRunning = true;
      console.log('🔄 Starting scheduled news scraping...');

      const articles = await this.newsScraper.scrapeAllSources();
      let savedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (const articleData of articles) {
        try {
          // Check if article already exists
          const existingArticle = await Article.findOne({ url: articleData.url });

          if (existingArticle) {
            // Update engagement metrics if article exists
            if (existingArticle.engagement.views < articleData.engagement?.views) {
              existingArticle.engagement.views = articleData.engagement.views;
              await existingArticle.save();
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            // Create new article
            const article = new Article(articleData);
            await article.save();
            savedCount++;
          }
        } catch (saveError) {
          console.error(`Error processing article ${articleData.url}:`, saveError.message);
          skippedCount++;
        }
      }

      console.log(`✅ News scraping completed: ${savedCount} new, ${updatedCount} updated, ${skippedCount} skipped`);

    } catch (error) {
      console.error('❌ Scheduled news scraping failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Clean up old articles (older than 30 days)
   */
  async cleanupOldArticles() {
    try {
      console.log('🧹 Starting article cleanup...');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Mark old articles as inactive instead of deleting
      const result = await Article.updateMany(
        {
          publishedAt: { $lt: thirtyDaysAgo },
          isActive: true
        },
        {
          $set: { isActive: false }
        }
      );

      console.log(`✅ Article cleanup completed: ${result.modifiedCount} articles archived`);

    } catch (error) {
      console.error('❌ Article cleanup failed:', error);
    }
  }

  /**
   * Generate daily analytics
   */
  async generateDailyAnalytics() {
    try {
      console.log('📊 Generating daily analytics...');

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Get articles from yesterday
      const yesterdayArticles = await Article.find({
        publishedAt: {
          $gte: yesterday,
          $lt: today
        },
        isActive: true
      });

      // Calculate analytics
      const analytics = {
        date: yesterday.toISOString().split('T')[0],
        totalArticles: yesterdayArticles.length,
        avgPositivity: yesterdayArticles.length > 0
          ? yesterdayArticles.reduce((sum, a) => sum + (a.aiAnalysis?.positivityScore || 0), 0) / yesterdayArticles.length
          : 0,
        avgQuality: yesterdayArticles.length > 0
          ? yesterdayArticles.reduce((sum, a) => sum + (a.aiAnalysis?.qualityScore || 0), 0) / yesterdayArticles.length
          : 0,
        categoryBreakdown: this.getCategoryBreakdown(yesterdayArticles),
        topSources: this.getTopSources(yesterdayArticles),
        trendingKeywords: this.getTrendingKeywords(yesterdayArticles)
      };

      // Store analytics (you might want to create an Analytics model)
      console.log('Daily Analytics:', JSON.stringify(analytics, null, 2));

      console.log('✅ Daily analytics generated successfully');

    } catch (error) {
      console.error('❌ Daily analytics generation failed:', error);
    }
  }

  /**
   * Update trending topics cache
   */
  async updateTrendingTopics() {
    try {
      console.log('📈 Updating trending topics...');

      const trendingTopics = await this.newsScraper.getTrendingTopics('24h');
      
      // Store in cache or database
      // For now, just log the results
      console.log('Trending Topics:', trendingTopics.slice(0, 5));

      console.log('✅ Trending topics updated successfully');

    } catch (error) {
      console.error('❌ Trending topics update failed:', error);
    }
  }

  /**
   * Get category breakdown for analytics
   */
  getCategoryBreakdown(articles) {
    const breakdown = {};
    
    articles.forEach(article => {
      if (article.categories) {
        article.categories.forEach(category => {
          breakdown[category] = (breakdown[category] || 0) + 1;
        });
      }
    });

    return Object.entries(breakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([category, count]) => ({ category, count }));
  }

  /**
   * Get top sources for analytics
   */
  getTopSources(articles) {
    const sources = {};
    
    articles.forEach(article => {
      if (article.source && article.source.name) {
        const sourceName = article.source.name;
        sources[sourceName] = (sources[sourceName] || 0) + 1;
      }
    });

    return Object.entries(sources)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([source, count]) => ({ source, count }));
  }

  /**
   * Get trending keywords for analytics
   */
  getTrendingKeywords(articles) {
    const keywords = {};
    
    articles.forEach(article => {
      if (article.aiAnalysis && article.aiAnalysis.keywords) {
        article.aiAnalysis.keywords.forEach(keyword => {
          keywords[keyword] = (keywords[keyword] || 0) + 1;
        });
      }
    });

    return Object.entries(keywords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([keyword, count]) => ({ keyword, count }));
  }

  /**
   * Manual trigger for immediate scraping
   */
  async triggerImmediateScraping() {
    if (this.isRunning) {
      throw new Error('Scraping is already in progress');
    }
    
    return await this.scrapeAndProcessNews();
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextScraping: this.getNextCronTime('*/30 * * * *'),
      nextCleanup: this.getNextCronTime('0 2 * * *'),
      nextAnalytics: this.getNextCronTime('0 1 * * *'),
      nextTrending: this.getNextCronTime('0 * * * *')
    };
  }

  /**
   * Calculate next cron execution time
   */
  getNextCronTime(cronExpression) {
    // This is a simplified calculation
    // In production, you might want to use a proper cron parser
    const now = new Date();
    const next = new Date(now);
    
    if (cronExpression === '*/30 * * * *') {
      // Every 30 minutes
      const minutes = now.getMinutes();
      const nextMinutes = minutes < 30 ? 30 : 60;
      next.setMinutes(nextMinutes, 0, 0);
      if (nextMinutes === 60) {
        next.setHours(next.getHours() + 1);
        next.setMinutes(0);
      }
    } else if (cronExpression === '0 * * * *') {
      // Every hour
      next.setHours(next.getHours() + 1, 0, 0, 0);
    } else if (cronExpression === '0 1 * * *') {
      // Daily at 1 AM
      next.setDate(next.getDate() + 1);
      next.setHours(1, 0, 0, 0);
    } else if (cronExpression === '0 2 * * *') {
      // Daily at 2 AM
      next.setDate(next.getDate() + 1);
      next.setHours(2, 0, 0, 0);
    }
    
    return next.toISOString();
  }
}

module.exports = SchedulerService;