# Dashboard1 Backend API

## 🚀 Overview

Backend API for Dashboard1 - An AI-powered news aggregation platform that prioritizes positivity, constructive content, and meaningful discussions over breaking noise.

## 🏗️ Architecture

```
Frontend (Dashboard1)     Backend API              Database
┌─────────────────┐      ┌─────────────────┐     ┌─────────────────┐
│ React/Vanilla   │      │ Node.js/Express │     │ MongoDB Atlas   │
│ - News Display  │◄────►│ - REST API      │◄───►│ - Users         │
│ - PWA Features  │      │ - Authentication│     │ - Articles      │
│ - AI Curation   │      │ - User Mgmt     │     │ - Analytics     │
└─────────────────┘      │ - Admin Panel   │     │ - Preferences   │
                         └─────────────────┘     └─────────────────┘
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **AI/ML**: Sentiment Analysis, Content Classification
- **Deployment**: Railway, Render, or AWS

## 📊 Features

### 🔐 Authentication & User Management
- User registration and login
- JWT-based authentication
- Role-based access control (User, Moderator, Admin)
- User preferences and personalization
- Reading analytics and statistics

### 📰 News Management
- Personalized news feeds
- AI-powered content curation
- Sentiment and positivity scoring
- Category-based filtering
- Search functionality
- Trending articles

### 📈 Analytics & Insights
- User reading behavior tracking
- Content engagement metrics
- Performance analytics
- Admin dashboard insights

### 🛡️ Security & Performance
- Rate limiting and DDoS protection
- Input validation and sanitization
- Error handling and logging
- Database optimization with indexes
- Caching strategies

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MongoDB running locally or MongoDB Atlas account
- Git for version control

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/maheshmaheshwarr-stack/Dashboard1.git
cd Dashboard1/backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start MongoDB** (if running locally)
```bash
mongod
```

5. **Run the server**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

### Base URL
- Development: `http://localhost:5000/api`
- Production: `https://api.dashboard1.maheshramanathan.com/api`

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "login": "john@example.com",
  "password": "securepassword"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <jwt_token>
```

### News Endpoints

#### Get Personalized Feed
```http
GET /api/news/feed?page=1&limit=20&category=technology&positivity=0.1
Authorization: Bearer <jwt_token> (optional)
```

#### Get Trending Articles
```http
GET /api/news/trending?limit=10
```

#### Search Articles
```http
GET /api/news/search?q=artificial%20intelligence&page=1&limit=10
```

#### Get Article Details
```http
GET /api/news/article/:id
```

#### Record Article Read
```http
POST /api/news/read/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "readingTime": 120
}
```

### User Management Endpoints

#### Update Preferences
```http
PUT /api/auth/preferences
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "categories": ["technology", "science", "ai"],
  "positivityThreshold": 0.2,
  "languages": ["en"],
  "digestFrequency": "daily"
}
```

## 🗄️ Database Schema

### User Model
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  profile: {
    firstName: String,
    lastName: String,
    avatar: String,
    bio: String
  },
  preferences: {
    categories: [String],
    positivityThreshold: Number,
    languages: [String],
    digestFrequency: String
  },
  analytics: {
    totalReads: Number,
    readingTime: Number,
    favoriteCategories: [String]
  },
  role: String,
  createdAt: Date
}
```

### Article Model
```javascript
{
  title: String,
  description: String,
  content: String,
  url: String,
  source: {
    name: String,
    category: String,
    reliability: Number
  },
  aiAnalysis: {
    sentimentScore: Number,
    positivityScore: Number,
    qualityScore: Number,
    keywords: [String],
    readingTime: Number
  },
  engagement: {
    views: Number,
    reads: Number,
    shares: Number
  },
  publishedAt: Date
}
```

## 🔧 Configuration

### Environment Variables
```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/dashboard1
JWT_SECRET=your_secret_key
ALLOWED_ORIGINS=http://localhost:3000,https://maheshmaheshwarr-stack.github.io
```

### Database Indexes
The application automatically creates optimized indexes for:
- User email and username lookups
- Article queries by category, date, and scores
- Analytics and engagement metrics

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

### Railway Deployment
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on git push

### Manual Deployment
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📊 Monitoring & Analytics

### Health Check
```http
GET /health
```

### API Status
```http
GET /api
```

### Performance Metrics
- Response time monitoring
- Database query optimization
- Error rate tracking
- User engagement analytics

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Sanitize all inputs
- **CORS Protection**: Control cross-origin requests
- **Helmet Security**: HTTP security headers
- **Password Hashing**: bcrypt with salt rounds

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Mahesh Ramanathan**
- GitHub: [@maheshmaheshwarr-stack](https://github.com/maheshmaheshwarr-stack)
- LinkedIn: [Mahesh Ramanathan](https://linkedin.com/in/mahesh-ramanathan-51b9824)
- Email: mahesh.maheshwarr@gmail.com

## 🙏 Acknowledgments

- Built with enterprise-grade practices from 20+ years of PeopleSoft experience
- Inspired by the need for constructive, positive news consumption
- Designed for scalability and maintainability

---

**Made with ❤️ for a better news experience**