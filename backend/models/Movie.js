const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  // External API identifiers
  imdbID: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tmdbID: {
    type: String,
    index: true
  },
  
  // Basic movie information
  title: {
    type: String,
    required: [true, 'Movie title is required'],
    trim: true,
    index: true
  },
  year: {
    type: Number,
    required: true,
    min: [1888, 'Year must be valid'],
    max: [new Date().getFullYear() + 5, 'Year cannot be too far in the future']
  },
  released: {
    type: Date
  },
  runtime: {
    type: Number, // in minutes
    min: [1, 'Runtime must be positive']
  },
  
  // Content details
  genre: [{
    type: String,
    trim: true
  }],
  director: [{
    type: String,
    trim: true
  }],
  writer: [{
    type: String,
    trim: true
  }],
  actors: [{
    type: String,
    trim: true
  }],
  plot: {
    type: String,
    trim: true
  },
  language: [{
    type: String,
    trim: true
  }],
  country: [{
    type: String,
    trim: true
  }],
  
  // Ratings and scores
  rating: {
    imdb: {
      score: { type: Number, min: 0, max: 10 },
      votes: { type: Number, min: 0 }
    },
    rottenTomatoes: {
      score: { type: Number, min: 0, max: 100 }
    },
    metacritic: {
      score: { type: Number, min: 0, max: 100 }
    }
  },
  
  // Media content
  poster: {
    type: String,
    trim: true
  },
  images: [{
    type: String,
    trim: true
  }],
  
  // Technical details
  rated: {
    type: String, // PG, PG-13, R, etc.
    trim: true
  },
  type: {
    type: String,
    enum: ['movie', 'series', 'episode'],
    default: 'movie'
  },
  
  // External links
  links: {
    imdb: String,
    tmdb: String,
    trailer: String
  },
  
  // Cache management
  cacheExpiry: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    index: { expireAfterSeconds: 0 }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    enum: ['omdb', 'tmdb'],
    required: true
  }
}, {
  timestamps: true
});

// Indexes for performance
movieSchema.index({ year: 1 });
movieSchema.index({ 'genre': 1 });
movieSchema.index({ 'rating.imdb.score': -1 });
movieSchema.index({ createdAt: -1 });
movieSchema.index({ cacheExpiry: 1 });

// Text index without language field conflicts
movieSchema.index({ 
  title: 'text', 
  plot: 'text' 
}, { 
  default_language: 'english',
  language_override: 'textLanguage' // Use a different field name
});

// Virtual for average rating
movieSchema.virtual('averageRating').get(function() {
  const ratings = [];
  if (this.rating.imdb.score) ratings.push(this.rating.imdb.score);
  if (this.rating.rottenTomatoes.score) ratings.push(this.rating.rottenTomatoes.score / 10);
  if (this.rating.metacritic.score) ratings.push(this.rating.metacritic.score / 10);
  
  return ratings.length > 0 ? 
    ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 
    null;
});

// Method to check if cache is expired
movieSchema.methods.isCacheExpired = function() {
  return new Date() > this.cacheExpiry;
};

// Method to refresh cache expiry
movieSchema.methods.refreshCache = function() {
  this.cacheExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  this.lastUpdated = new Date();
  return this.save();
};

// Static method to clean expired cache
movieSchema.statics.cleanExpiredCache = function() {
  return this.deleteMany({ cacheExpiry: { $lt: new Date() } });
};

// Transform output
movieSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Movie', movieSchema);