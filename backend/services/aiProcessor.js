const Sentiment = require('sentiment');
const axios = require('axios');

class AIProcessor {
  constructor() {
    this.sentiment = new Sentiment();
    
    // Initialize with custom word lists for news analysis
    this.sentiment.registerLanguage('en', {
      labels: {
        // Positive news words
        'breakthrough': 5,
        'innovation': 4,
        'success': 4,
        'achievement': 4,
        'progress': 3,
        'improvement': 3,
        'solution': 3,
        'recovery': 3,
        'growth': 2,
        'positive': 2,
        'beneficial': 2,
        'constructive': 2,
        
        // Negative news words (to filter out)
        'crisis': -5,
        'disaster': -5,
        'catastrophe': -5,
        'tragedy': -4,
        'scandal': -4,
        'corruption': -4,
        'violence': -4,
        'conflict': -3,
        'problem': -2,
        'issue': -1,
        'concern': -1,
        
        // Neutral but important
        'analysis': 1,
        'research': 1,
        'study': 1,
        'report': 0,
        'data': 0
      }
    });
  }

  /**
   * Analyze article sentiment and positivity
   * @param {string} title - Article title
   * @param {string} description - Article description
   * @param {string} content - Full article content
   * @returns {Object} Analysis results
   */
  analyzeSentiment(title, description, content = '') {
    try {
      // Combine text for analysis (title weighted more heavily)
      const combinedText = `${title} ${title} ${description} ${content}`;
      
      // Get sentiment analysis
      const result = this.sentiment.analyze(combinedText);
      
      // Normalize sentiment score to -1 to 1 range
      const normalizedScore = Math.max(-1, Math.min(1, result.score / 10));
      
      // Calculate positivity score (0 to 1)
      const positivityScore = Math.max(0, (normalizedScore + 1) / 2);
      
      // Calculate constructiveness based on specific keywords
      const constructivenessScore = this.calculateConstructiveness(combinedText);
      
      // Calculate urgency/panic score (lower is better for our "signal over noise" approach)
      const urgencyScore = this.calculateUrgency(combinedText);
      
      return {
        sentimentScore: Math.round(normalizedScore * 100) / 100,
        positivityScore: Math.round(positivityScore * 100) / 100,
        constructivenessScore: Math.round(constructivenessScore * 100) / 100,
        urgencyScore: Math.round(urgencyScore * 100) / 100,
        qualityScore: this.calculateQualityScore(title, description, content),
        keywords: this.extractKeywords(combinedText),
        entities: this.extractEntities(combinedText),
        readingTime: this.calculateReadingTime(content || description)
      };
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Calculate constructiveness score based on solution-oriented language
   */
  calculateConstructiveness(text) {
    const constructiveWords = [
      'solution', 'solve', 'improve', 'build', 'create', 'develop',
      'progress', 'advance', 'breakthrough', 'innovation', 'research',
      'study', 'analysis', 'plan', 'strategy', 'initiative', 'program',
      'collaboration', 'partnership', 'cooperation', 'agreement',
      'investment', 'funding', 'support', 'help', 'assist'
    ];
    
    const destructiveWords = [
      'destroy', 'damage', 'harm', 'hurt', 'attack', 'fight',
      'war', 'conflict', 'violence', 'crisis', 'disaster',
      'fail', 'failure', 'collapse', 'crash', 'break'
    ];
    
    let constructiveCount = 0;
    let destructiveCount = 0;
    
    const words = text.toLowerCase().split(/\W+/);
    
    words.forEach(word => {
      if (constructiveWords.includes(word)) constructiveCount++;
      if (destructiveWords.includes(word)) destructiveCount++;
    });
    
    const totalWords = words.length;
    const constructiveRatio = constructiveCount / totalWords;
    const destructiveRatio = destructiveCount / totalWords;
    
    // Score from 0 to 1, where 1 is most constructive
    return Math.max(0, Math.min(1, 0.5 + (constructiveRatio - destructiveRatio) * 10));
  }

  /**
   * Calculate urgency/panic score (lower is better for our approach)
   */
  calculateUrgency(text) {
    const urgentWords = [
      'breaking', 'urgent', 'emergency', 'crisis', 'immediate',
      'now', 'today', 'just', 'suddenly', 'shock', 'surprise',
      'alert', 'warning', 'danger', 'threat', 'risk'
    ];
    
    const calmWords = [
      'analysis', 'study', 'research', 'long-term', 'gradual',
      'steady', 'consistent', 'planned', 'scheduled', 'expected',
      'trend', 'pattern', 'development', 'evolution'
    ];
    
    let urgentCount = 0;
    let calmCount = 0;
    
    const words = text.toLowerCase().split(/\W+/);
    
    words.forEach(word => {
      if (urgentWords.includes(word)) urgentCount++;
      if (calmWords.includes(word)) calmCount++;
    });
    
    const totalWords = words.length;
    const urgentRatio = urgentCount / totalWords;
    const calmRatio = calmCount / totalWords;
    
    // Score from 0 to 1, where 0 is calm/analytical and 1 is urgent/panicky
    return Math.max(0, Math.min(1, 0.5 + (urgentRatio - calmRatio) * 10));
  }

  /**
   * Calculate overall quality score
   */
  calculateQualityScore(title, description, content) {
    let score = 0.5; // Base score
    
    // Title quality (clear, not clickbait)
    if (title && title.length > 10 && title.length < 100) score += 0.1;
    if (title && !this.isClickbait(title)) score += 0.1;
    
    // Description quality
    if (description && description.length > 50 && description.length < 300) score += 0.1;
    
    // Content depth
    if (content) {
      const wordCount = content.split(/\W+/).length;
      if (wordCount > 200) score += 0.1;
      if (wordCount > 500) score += 0.1;
    }
    
    // Grammar and structure (basic check)
    const combinedText = `${title} ${description}`;
    if (this.hasGoodStructure(combinedText)) score += 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Detect clickbait titles
   */
  isClickbait(title) {
    const clickbaitPatterns = [
      /you won't believe/i,
      /shocking/i,
      /amazing/i,
      /incredible/i,
      /this will/i,
      /what happens next/i,
      /doctors hate/i,
      /one weird trick/i,
      /\d+ reasons why/i,
      /number \d+ will/i
    ];
    
    return clickbaitPatterns.some(pattern => pattern.test(title));
  }

  /**
   * Check for good text structure
   */
  hasGoodStructure(text) {
    // Basic checks for proper capitalization, punctuation
    const sentences = text.split(/[.!?]+/);
    const properSentences = sentences.filter(s => 
      s.trim().length > 5 && 
      /^[A-Z]/.test(s.trim())
    );
    
    return properSentences.length / sentences.length > 0.7;
  }

  /**
   * Extract keywords using simple frequency analysis
   */
  extractKeywords(text, maxKeywords = 10) {
    // Common stop words to filter out
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i',
      'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ]);
    
    // Extract words and count frequency
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 3 && 
        !stopWords.has(word) &&
        !/^\d+$/.test(word)
      );
    
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Sort by frequency and return top keywords
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  /**
   * Extract entities (simple pattern matching)
   */
  extractEntities(text) {
    const entities = [];
    
    // Extract potential company names (capitalized words)
    const companyPattern = /\b[A-Z][a-z]+ (?:Inc|Corp|LLC|Ltd|Company|Technologies|Systems|Solutions)\b/g;
    const companies = text.match(companyPattern) || [];
    companies.forEach(company => {
      entities.push({ name: company, type: 'ORGANIZATION', confidence: 0.8 });
    });
    
    // Extract potential person names (Title + Name pattern)
    const personPattern = /\b(?:Mr|Ms|Mrs|Dr|Prof|CEO|President|Director)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g;
    const persons = text.match(personPattern) || [];
    persons.forEach(person => {
      entities.push({ name: person, type: 'PERSON', confidence: 0.7 });
    });
    
    // Extract locations (basic pattern)
    const locationPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2,}\b/g;
    const locations = text.match(locationPattern) || [];
    locations.forEach(location => {
      entities.push({ name: location, type: 'LOCATION', confidence: 0.6 });
    });
    
    return entities.slice(0, 10); // Limit to top 10 entities
  }

  /**
   * Calculate reading time in minutes
   */
  calculateReadingTime(text) {
    const wordsPerMinute = 200; // Average reading speed
    const wordCount = text.split(/\W+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  /**
   * Classify article into categories
   */
  classifyCategory(title, description, content = '') {
    const categoryKeywords = {
      technology: [
        'technology', 'tech', 'software', 'hardware', 'computer', 'digital',
        'ai', 'artificial intelligence', 'machine learning', 'blockchain',
        'cryptocurrency', 'bitcoin', 'app', 'mobile', 'internet', 'web',
        'startup', 'silicon valley', 'programming', 'coding', 'developer'
      ],
      business: [
        'business', 'company', 'corporate', 'finance', 'financial', 'economy',
        'economic', 'market', 'stock', 'investment', 'revenue', 'profit',
        'earnings', 'ceo', 'executive', 'merger', 'acquisition', 'ipo',
        'nasdaq', 'dow jones', 'wall street', 'banking', 'trade'
      ],
      science: [
        'science', 'research', 'study', 'scientist', 'discovery', 'experiment',
        'laboratory', 'university', 'academic', 'journal', 'peer review',
        'biology', 'chemistry', 'physics', 'medicine', 'medical', 'health',
        'climate', 'environment', 'space', 'nasa', 'astronomy'
      ],
      health: [
        'health', 'medical', 'medicine', 'doctor', 'hospital', 'patient',
        'treatment', 'therapy', 'drug', 'vaccine', 'disease', 'illness',
        'wellness', 'fitness', 'nutrition', 'diet', 'mental health',
        'healthcare', 'pharmaceutical', 'clinical', 'diagnosis'
      ],
      politics: [
        'politics', 'political', 'government', 'congress', 'senate', 'house',
        'president', 'minister', 'election', 'vote', 'campaign', 'policy',
        'law', 'legislation', 'bill', 'democrat', 'republican', 'party',
        'administration', 'federal', 'state', 'local', 'court', 'supreme'
      ],
      sports: [
        'sports', 'sport', 'game', 'match', 'team', 'player', 'athlete',
        'football', 'basketball', 'baseball', 'soccer', 'tennis', 'golf',
        'olympics', 'championship', 'league', 'nfl', 'nba', 'mlb', 'fifa',
        'coach', 'training', 'competition', 'tournament', 'score', 'win'
      ]
    };
    
    const text = `${title} ${description} ${content}`.toLowerCase();
    const scores = {};
    
    // Calculate category scores
    Object.entries(categoryKeywords).forEach(([category, keywords]) => {
      let score = 0;
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length;
        }
      });
      scores[category] = score;
    });
    
    // Find the category with highest score
    const topCategory = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)[0];
    
    return topCategory && topCategory[1] > 0 ? topCategory[0] : 'general';
  }

  /**
   * Generate personalized recommendations
   */
  generateRecommendations(userPreferences, articles, limit = 5) {
    return articles
      .filter(article => {
        // Filter by user's positivity threshold
        if (article.aiAnalysis.positivityScore < userPreferences.positivityThreshold) {
          return false;
        }
        
        // Filter by preferred categories
        if (userPreferences.categories.length > 0) {
          return userPreferences.categories.some(cat => 
            article.categories.includes(cat)
          );
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sort by quality and positivity
        const scoreA = (a.aiAnalysis.qualityScore * 0.6) + (a.aiAnalysis.positivityScore * 0.4);
        const scoreB = (b.aiAnalysis.qualityScore * 0.6) + (b.aiAnalysis.positivityScore * 0.4);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Get default analysis for error cases
   */
  getDefaultAnalysis() {
    return {
      sentimentScore: 0,
      positivityScore: 0.5,
      constructivenessScore: 0.5,
      urgencyScore: 0.5,
      qualityScore: 0.5,
      keywords: [],
      entities: [],
      readingTime: 2
    };
  }

  /**
   * Batch process multiple articles
   */
  async batchAnalyze(articles) {
    const results = [];
    
    for (const article of articles) {
      try {
        const analysis = this.analyzeSentiment(
          article.title,
          article.description,
          article.content
        );
        
        const category = this.classifyCategory(
          article.title,
          article.description,
          article.content
        );
        
        results.push({
          ...article,
          aiAnalysis: analysis,
          categories: [category],
          processedAt: new Date()
        });
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 10));
        
      } catch (error) {
        console.error(`Error processing article ${article.url}:`, error);
        results.push({
          ...article,
          aiAnalysis: this.getDefaultAnalysis(),
          categories: ['general'],
          processedAt: new Date()
        });
      }
    }
    
    return results;
  }
}

module.exports = AIProcessor;