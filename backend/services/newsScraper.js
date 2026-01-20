const Parser = require('rss-parser');
const axios = require('axios');
const AIProcessor = require('./aiProcessor');

class NewsScraper {
  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['media:content', 'media:thumbnail', 'enclosure']
      }
    });
    this.aiProcessor = new AIProcessor();
    
    // News sources configuration
    this.sources = [
      // Technology
      {
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed/',
        category: 'technology',
        reliability: 0.85
      },
      {
        name: 'The Verge',
        url: 'https://www.theverge.com/rss/index.xml',
        category: 'technology',
        reliability: 0.80
      },
      {
        name: 'Wired',
        url: 'https://www.wired.com/feed/rss',
        category: 'technology',
        reliability: 0.85
      },
      
      // Business
      {
        name: 'Reuters Business',
        url: 'https://feeds.reuters.com/reuters/businessNews',
        category: 'business',
        reliability: 0.95
      },
      {
        name: 'BBC Business',
        url: 'https://feeds.bbci.co.uk/news/business/rss.xml',
        category: 'business',
        reliability: 0.90
      },
      
      // Science
      {
        name: 'Science Daily',
        url: 'https://www.sciencedaily.com/rss/all.xml',
        category: 'science',
        reliability: 0.90
      },
      {
        name: 'Nature News',
        url: 'https://www.nature.com/nature.rss',
        category: 'science',
        reliability: 0.95
      },
      
      // Health
      {
        name: 'Medical News Today',
        url: 'https://www.medicalnewstoday.com/rss',
        category: 'health',
        reliability: 0.80
      },
      
      // General News
      {
        name: 'BBC News',
        url: 'https://feeds.bbci.co.uk/news/rss.xml',
        category: 'world',
        reliability: 0.90
      },
      {
        name: 'Reuters',
        url: 'https://feeds.reuters.com/Reuters/worldNews',
        category: 'world',
        reliability: 0.95
      },
      
      // Indian News
      {
        name: 'The Hindu',
        url: 'https://www.thehindu.com/feeder/default.rss',
        category: 'local',
        reliability: 0.85
      },
      {
        name: 'Times of India',
        url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
        category: 'local',
        reliability: 0.75
      },
      
      // Positive News Sources
      {
        name: 'Good News Network',
        url: 'https://www.goodnewsnetwork.org/feed/',
        category: 'culture',
        reliability: 0.70
      },
      {
        name: 'Positive News',
        url: 'https://www.positive.news/feed/',
        category: 'culture',
        reliability: 0.75
      }
    ];
  }

  /**
   * Scrape articles from all configured sources
   */
  async scrapeAllSources() {
    console.log('🔄 Starting news scraping from all sources...');
    const allArticles = [];
    
    for (const source of this.sources) {
      try {
        console.log(`📰 Scraping ${source.name}...`);
        const articles = await this.scrapeSource(source);
        allArticles.push(...articles);
        
        // Delay between sources to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error scraping ${source.name}:`, error.message);
      }
    }
    
    console.log(`✅ Scraped ${allArticles.length} articles from ${this.sources.length} sources`);
    return allArticles;
  }

  /**
   * Scrape articles from a single source
   */
  async scrapeSource(source) {
    try {
      const feed = await this.parser.parseURL(source.url);
      const articles = [];
      
      for (const item of feed.items.slice(0, 10)) { // Limit to 10 articles per source
        try {
          const article = await this.processArticle(item, source);
          if (article) {
            articles.push(article);
          }
        } catch (error) {
          console.error(`Error processing article from ${source.name}:`, error.message);
        }
      }
      
      return articles;
    } catch (error) {
      console.error(`Failed to fetch RSS feed from ${source.name}:`, error.message);
      return [];
    }
  }

  /**
   * Process a single article with AI analysis
   */
  async processArticle(item, source) {
    try {
      // Extract basic article data
      const article = {
        title: this.cleanText(item.title || ''),
        description: this.cleanText(item.contentSnippet || item.summary || ''),
        content: this.cleanText(item.content || item.description || ''),
        url: item.link || '',
        source: {
          name: source.name,
          url: source.url,
          category: source.category,
          reliability: source.reliability
        },
        author: {
          name: item.creator || item.author || ''
        },
        publishedAt: new Date(item.pubDate || item.isoDate || Date.now()),
        scrapedAt: new Date(),
        language: 'en',
        tags: this.extractTags(item),
        metadata: {
          wordCount: this.countWords(item.content || item.description || ''),
          hasPaywall: false,
          isBreaking: this.isBreakingNews(item.title || ''),
          isOpinion: this.isOpinion(item.title || '', item.contentSnippet || '')
        }
      };

      // Skip if essential data is missing
      if (!article.title || !article.url || article.title.length < 10) {
        return null;
      }

      // Run AI analysis
      const aiAnalysis = this.aiProcessor.analyzeSentiment(
        article.title,
        article.description,
        article.content
      );

      // Auto-classify category
      const autoCategory = this.aiProcessor.classifyCategory(
        article.title,
        article.description,
        article.content
      );

      // Combine source category with AI classification
      article.categories = [source.category];
      if (autoCategory !== 'general' && autoCategory !== source.category) {
        article.categories.push(autoCategory);
      }

      // Add AI analysis
      article.aiAnalysis = aiAnalysis;

      // Set curation status based on quality and positivity
      article.curation = {
        status: this.determineCurationStatus(aiAnalysis),
        curatedAt: new Date(),
        priority: this.calculatePriority(aiAnalysis, source.reliability)
      };

      return article;

    } catch (error) {
      console.error('Error processing article:', error);
      return null;
    }
  }

  /**
   * Clean and normalize text content
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[^;]+;/g, ' ') // Remove HTML entities
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Extract tags from RSS item
   */
  extractTags(item) {
    const tags = [];
    
    // From categories
    if (item.categories) {
      tags.push(...item.categories);
    }
    
    // From keywords in content
    if (item.keywords) {
      tags.push(...item.keywords.split(',').map(k => k.trim()));
    }
    
    return [...new Set(tags)].slice(0, 10); // Remove duplicates and limit
  }

  /**
   * Count words in text
   */
  countWords(text) {
    if (!text) return 0;
    return text.split(/\W+/).filter(word => word.length > 0).length;
  }

  /**
   * Detect breaking news
   */
  isBreakingNews(title) {
    const breakingKeywords = ['breaking', 'urgent', 'just in', 'developing', 'live'];
    return breakingKeywords.some(keyword => 
      title.toLowerCase().includes(keyword)
    );
  }

  /**
   * Detect opinion pieces
   */
  isOpinion(title, description) {
    const opinionKeywords = ['opinion', 'editorial', 'commentary', 'analysis', 'perspective', 'viewpoint'];
    const text = `${title} ${description}`.toLowerCase();
    return opinionKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Determine curation status based on AI analysis
   */
  determineCurationStatus(aiAnalysis) {
    const { positivityScore, qualityScore, constructivenessScore, urgencyScore } = aiAnalysis;
    
    // Calculate overall score
    const overallScore = (
      positivityScore * 0.3 +
      qualityScore * 0.3 +
      constructivenessScore * 0.3 +
      (1 - urgencyScore) * 0.1 // Lower urgency is better
    );
    
    if (overallScore >= 0.7) return 'featured';
    if (overallScore >= 0.5) return 'approved';
    if (overallScore >= 0.3) return 'pending';
    return 'rejected';
  }

  /**
   * Calculate article priority
   */
  calculatePriority(aiAnalysis, sourceReliability) {
    const { qualityScore, positivityScore, constructivenessScore } = aiAnalysis;
    
    const priority = Math.round(
      (qualityScore * 0.4 + 
       positivityScore * 0.3 + 
       constructivenessScore * 0.2 + 
       sourceReliability * 0.1) * 10
    );
    
    return Math.max(1, Math.min(10, priority));
  }

  /**
   * Get articles by category with AI filtering
   */
  async getFilteredArticles(options = {}) {
    const {
      category = null,
      positivityThreshold = 0.1,
      qualityThreshold = 0.3,
      limit = 20,
      sortBy = 'quality' // 'quality', 'positivity', 'recent'
    } = options;

    // This would typically query your database
    // For now, we'll return a sample structure
    const articles = await this.scrapeAllSources();
    
    let filtered = articles.filter(article => {
      if (!article.aiAnalysis) return false;
      
      // Filter by positivity threshold
      if (article.aiAnalysis.positivityScore < positivityThreshold) return false;
      
      // Filter by quality threshold
      if (article.aiAnalysis.qualityScore < qualityThreshold) return false;
      
      // Filter by category
      if (category && !article.categories.includes(category)) return false;
      
      return true;
    });

    // Sort articles
    switch (sortBy) {
      case 'positivity':
        filtered.sort((a, b) => b.aiAnalysis.positivityScore - a.aiAnalysis.positivityScore);
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        break;
      case 'quality':
      default:
        filtered.sort((a, b) => b.aiAnalysis.qualityScore - a.aiAnalysis.qualityScore);
        break;
    }

    return filtered.slice(0, limit);
  }

  /**
   * Get trending topics using AI keyword analysis
   */
  async getTrendingTopics(timeframe = '24h') {
    const articles = await this.scrapeAllSources();
    const keywordCounts = {};
    
    articles.forEach(article => {
      if (article.aiAnalysis && article.aiAnalysis.keywords) {
        article.aiAnalysis.keywords.forEach(keyword => {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        });
      }
    });
    
    return Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));
  }

  /**
   * Generate daily digest with AI curation
   */
  async generateDailyDigest(userPreferences = {}) {
    const articles = await this.getFilteredArticles({
      positivityThreshold: userPreferences.positivityThreshold || 0.2,
      qualityThreshold: 0.6,
      limit: 50
    });

    const digest = {
      date: new Date().toISOString().split('T')[0],
      summary: {
        totalArticles: articles.length,
        avgPositivity: articles.reduce((sum, a) => sum + a.aiAnalysis.positivityScore, 0) / articles.length,
        avgQuality: articles.reduce((sum, a) => sum + a.aiAnalysis.qualityScore, 0) / articles.length,
        categories: [...new Set(articles.flatMap(a => a.categories))]
      },
      topStories: articles.slice(0, 5),
      trendingTopics: await this.getTrendingTopics(),
      personalizedRecommendations: this.aiProcessor.generateRecommendations(
        userPreferences,
        articles,
        10
      )
    };

    return digest;
  }
}

module.exports = NewsScraper;