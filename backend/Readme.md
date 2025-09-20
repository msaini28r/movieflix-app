# MovieFlix Dashboard - Backend API

A RESTful API for a movie dashboard application built with Node.js, Express, and MongoDB. Integrates with OMDB API for movie data with intelligent caching and JWT authentication.

## Features

- Movie search and caching system with OMDB API integration
- JWT-based authentication with role management
- Analytics and statistics endpoints for dashboard charts
- MongoDB caching with 24-hour expiry and cleanup
- Advanced filtering, sorting, and pagination
- Admin functionality for cache management

## Quick Setup

### Prerequisites
- Node.js 14+
- MongoDB
- OMDB API Key (from omdbapi.com)

### Installation
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your MongoDB URI and OMDB API key

# Seed database
npm run seed

# Start server
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (requires auth)

### Movies
- `GET /api/movies?search=term` - Search movies with caching
- `GET /api/movies/:id` - Get movie details
- `GET /api/movies?genre=Action&year=2020&sort=rating` - Advanced filtering
- `DELETE /api/movies/cache/expired` - Clear expired cache (admin only)

### Statistics
- `GET /api/stats/dashboard` - Dashboard overview data
- `GET /api/stats/genres` - Genre distribution analysis
- `GET /api/stats/ratings` - Rating distribution data

## Usage Examples

### Movie Search
```bash
# Basic search
curl "http://localhost:5001/api/movies?search=batman"

# Filtered search
curl "http://localhost:5001/api/movies?search=action&genre=Action&year=2020&sort=rating&order=desc"
```

### Authentication
```bash
# Register
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user","email":"user@test.com","password":"password123"}'

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123"}'
```

### Dashboard Data
```bash
# Get dashboard statistics
curl "http://localhost:5001/api/stats/dashboard"

# Genre analytics
curl "http://localhost:5001/api/stats/genres"
```

## Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/movieflix
JWT_SECRET=your_jwt_secret_key
OMDB_API_KEY=your_omdb_api_key
PORT=5001
NODE_ENV=development
```

## Default Users

After seeding:
- Admin: `admin@movieflix.com` / `admin123`
- User: `user@movieflix.com` / `user123`

## Project Structure

```
backend/
├── models/          # MongoDB schemas
├── routes/          # API endpoints
├── services/        # Business logic
├── middleware/      # Authentication & validation
├── jobs/           # Background tasks
└── scripts/        # Database seeding
```

## Key Features Implemented

### Movie Service
- OMDB API integration with error handling
- Local MongoDB caching (24-hour expiry)
- Search with filters (genre, year, rating)
- Data transformation and normalization

### Authentication
- JWT token-based authentication
- Role-based access (user/admin)
- Password hashing with bcrypt
- Profile management

### Analytics
- Genre distribution for pie charts
- Average ratings by genre for bar charts
- Runtime trends by year for line charts
- Top-rated movies and recent additions

### Cache Management
- Automatic cleanup job (runs daily at 2 AM)
- Admin endpoints for manual cache control
- Performance statistics and monitoring

## API Response Format

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

## Error Handling

- Input validation with Joi
- Consistent error response format
- Rate limiting (100 requests per 15 minutes)
- Graceful API failure handling

## Testing

```bash
# Health check
curl http://localhost:5001/api/health

# Test with sample data
npm run seed fresh
```
