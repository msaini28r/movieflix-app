const express = require('express');
const Joi = require('joi');
const movieService = require('../services/movieService');
const Movie = require('../models/Movie');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const searchSchema = Joi.object({
  search: Joi.string().min(1).max(100),
  genre: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ),
  year: Joi.alternatives().try(
    Joi.number().integer().min(1888).max(new Date().getFullYear() + 5),
    Joi.object({
      min: Joi.number().integer().min(1888),
      max: Joi.number().integer().max(new Date().getFullYear() + 5)
    })
  ),
  rating: Joi.alternatives().try(
    Joi.number().min(0).max(10),
    Joi.object({
      min: Joi.number().min(0).max(10),
      max: Joi.number().min(0).max(10)
    })
  ),
  sort: Joi.string().valid('title', 'year', 'rating', 'runtime', 'createdAt').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20)
});

// Search movies - GET /api/movies?search=batman&sort=rating&filter=genre:Action
router.get('/', optionalAuth, async (req, res) => {
  try {
    // Validate query parameters
    const { error, value } = searchSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        message: 'Invalid query parameters',
        details: error.details.map(d => d.message)
      });
    }

    const {
      search,
      genre,
      year,
      rating,
      sort: sortBy,
      order: sortOrder,
      page,
      limit
    } = value;

    let result;

    // If search term provided, search via API and cache
    if (search) {
      result = await movieService.searchMovies(search, { page });
      
      // Apply additional filters to search results
      if (result.movies && (genre || year || rating)) {
        result.movies = result.movies.filter(movie => {
          if (genre) {
            const genres = Array.isArray(genre) ? genre : [genre];
            if (!movie.genre.some(g => genres.includes(g))) return false;
          }
          
          if (year) {
            if (typeof year === 'object') {
              if (year.min && movie.year < year.min) return false;
              if (year.max && movie.year > year.max) return false;
            } else {
              if (movie.year !== year) return false;
            }
          }
          
          if (rating && movie.rating.imdb.score) {
            if (typeof rating === 'object') {
              if (rating.min && movie.rating.imdb.score < rating.min) return false;
              if (rating.max && movie.rating.imdb.score > rating.max) return false;
            } else {
              if (movie.rating.imdb.score < rating) return false;
            }
          }
          
          return true;
        });
      }
      
      // Sort results
      if (result.movies) {
        result.movies.sort((a, b) => {
          let aVal, bVal;
          
          switch (sortBy) {
            case 'title':
              aVal = a.title.toLowerCase();
              bVal = b.title.toLowerCase();
              break;
            case 'year':
              aVal = a.year || 0;
              bVal = b.year || 0;
              break;
            case 'rating':
              aVal = a.rating.imdb.score || 0;
              bVal = b.rating.imdb.score || 0;
              break;
            case 'runtime':
              aVal = a.runtime || 0;
              bVal = b.runtime || 0;
              break;
            default:
              aVal = new Date(a.createdAt || 0);
              bVal = new Date(b.createdAt || 0);
          }
          
          if (sortOrder === 'desc') {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
          } else {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          }
        });
      }
      
    } else {
      // Get cached movies with filters
      result = await movieService.getCachedMovies({
        genre,
        year,
        rating,
        sortBy,
        sortOrder,
        page,
        limit
      });
    }

    res.json({
      success: true,
      data: result.movies || [],
      pagination: result.pagination || {
        page,
        limit,
        total: result.totalResults || 0,
        pages: Math.ceil((result.totalResults || 0) / limit)
      },
      source: result.source || 'cache'
    });

  } catch (error) {
    console.error('Movies search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search movies',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get movie by ID - GET /api/movies/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate IMDB ID format
    if (!id.match(/^tt\d{7,8}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IMDB ID format'
      });
    }

    const result = await movieService.getMovieById(id);
    
    if (!result.movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    res.json({
      success: true,
      data: result.movie,
      source: result.source
    });

  } catch (error) {
    console.error('Get movie error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch movie',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all genres - GET /api/movies/genres
router.get('/meta/genres', async (req, res) => {
  try {
    const genres = await Movie.aggregate([
      { $unwind: '$genre' },
      { $group: { _id: '$genre', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { genre: '$_id', count: 1, _id: 0 } }
    ]);

    res.json({
      success: true,
      data: genres
    });

  } catch (error) {
    console.error('Get genres error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch genres'
    });
  }
});

// Get years range - GET /api/movies/meta/years
router.get('/meta/years', async (req, res) => {
  try {
    const yearStats = await Movie.aggregate([
      {
        $group: {
          _id: null,
          minYear: { $min: '$year' },
          maxYear: { $max: '$year' },
          years: { $addToSet: '$year' }
        }
      }
    ]);

    const stats = yearStats[0] || { minYear: null, maxYear: null, years: [] };
    
    res.json({
      success: true,
      data: {
        min: stats.minYear,
        max: stats.maxYear,
        available: stats.years.sort((a, b) => b - a)
      }
    });

  } catch (error) {
    console.error('Get years error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch years data'
    });
  }
});

// Admin only routes
// Delete movie from cache - DELETE /api/movies/:id
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedMovie = await Movie.findOneAndDelete({ imdbID: id });
    
    if (!deletedMovie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found in cache'
      });
    }

    res.json({
      success: true,
      message: 'Movie removed from cache',
      data: { imdbID: id, title: deletedMovie.title }
    });

  } catch (error) {
    console.error('Delete movie error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete movie'
    });
  }
});

// Update movie in cache - PUT /api/movies/:id
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find and update movie
    const movie = await Movie.findOne({ imdbID: id });
    
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found in cache'
      });
    }

    // Refresh from API
    const updatedData = await movieService.getMovieDetailsOMDB(id);
    Object.assign(movie, updatedData);
    movie.cacheExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    movie.lastUpdated = new Date();
    
    await movie.save();

    res.json({
      success: true,
      message: 'Movie updated in cache',
      data: movie
    });

  } catch (error) {
    console.error('Update movie error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update movie'
    });
  }
});

// Clear expired cache - DELETE /api/movies/cache/expired
router.delete('/cache/expired', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const deletedCount = await movieService.cleanExpiredCache();
    
    res.json({
      success: true,
      message: `Cleared ${deletedCount} expired cache entries`,
      deletedCount
    });

  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear expired cache'
    });
  }
});

// Clear all cache - DELETE /api/movies/cache/all
router.delete('/cache/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await Movie.deleteMany({});
    
    res.json({
      success: true,
      message: `Cleared all ${result.deletedCount} cache entries`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Clear all cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache'
    });
  }
});

// Export movies data as CSV - GET /api/movies/export/csv
router.get('/export/csv', optionalAuth, async (req, res) => {
  try {
    const movies = await Movie.find({}, {
      title: 1,
      year: 1,
      genre: 1,
      director: 1,
      'rating.imdb.score': 1,
      runtime: 1,
      imdbID: 1
    }).lean();

    // Convert to CSV format
    const csvHeader = 'Title,Year,Genre,Director,Rating,Runtime,IMDB_ID\n';
    const csvRows = movies.map(movie => {
      return [
        `"${movie.title || ''}"`,
        movie.year || '',
        `"${movie.genre ? movie.genre.join(', ') : ''}"`,
        `"${movie.director ? movie.director.join(', ') : ''}"`,
        movie.rating?.imdb?.score || '',
        movie.runtime || '',
        movie.imdbID || ''
      ].join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="movies.csv"');
    res.send(csvContent);

  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export movies data'
    });
  }
});

module.exports = router;