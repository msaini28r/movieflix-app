const express = require('express');
const Movie = require('../models/Movie');
const movieService = require('../services/movieService');
const { optionalAuth, authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics - GET /api/stats/dashboard
router.get('/dashboard', optionalAuth, async (req, res) => {
  try {
    const [
      genreDistribution,
      ratingsByGenre,
      runtimeByYear,
      topRatedMovies,
      recentlyAdded,
      cacheStats
    ] = await Promise.all([
      // Genre distribution for pie chart
      Movie.aggregate([
        { $match: { cacheExpiry: { $gt: new Date() } } },
        { $unwind: '$genre' },
        { $group: { _id: '$genre', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { genre: '$_id', count: 1, _id: 0 } }
      ]),

      // Average ratings by genre for bar chart
      Movie.aggregate([
        { $match: { 
          cacheExpiry: { $gt: new Date() },
          'rating.imdb.score': { $exists: true, $ne: null }
        }},
        { $unwind: '$genre' },
        { $group: { 
          _id: '$genre', 
          averageRating: { $avg: '$rating.imdb.score' },
          count: { $sum: 1 }
        }},
        { $match: { count: { $gte: 3 } } }, // Only genres with 3+ movies
        { $sort: { averageRating: -1 } },
        { $limit: 10 },
        { $project: { 
          genre: '$_id', 
          averageRating: { $round: ['$averageRating', 2] },
          count: 1,
          _id: 0 
        }}
      ]),

      // Average runtime by year for line chart
      Movie.aggregate([
        { $match: { 
          cacheExpiry: { $gt: new Date() },
          runtime: { $exists: true, $ne: null },
          year: { $gte: 1990 } // Focus on recent decades
        }},
        { $group: { 
          _id: '$year', 
          averageRuntime: { $avg: '$runtime' },
          count: { $sum: 1 }
        }},
        { $match: { count: { $gte: 2 } } }, // Only years with 2+ movies
        { $sort: { _id: 1 } },
        { $project: { 
          year: '$_id', 
          averageRuntime: { $round: ['$averageRuntime', 0] },
          count: 1,
          _id: 0 
        }}
      ]),

      // Top rated movies
      Movie.find({ 
        cacheExpiry: { $gt: new Date() },
        'rating.imdb.score': { $gte: 8.0 }
      })
      .sort({ 'rating.imdb.score': -1 })
      .limit(10)
      .select('title year rating.imdb.score genre imdbID')
      .lean(),

      // Recently added movies
      Movie.find({ cacheExpiry: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title year rating.imdb.score genre createdAt imdbID')
      .lean(),

      // Cache statistics
      movieService.getCacheStats()
    ]);

    res.json({
      success: true,
      data: {
        charts: {
          genreDistribution,
          ratingsByGenre,
          runtimeByYear
        },
        highlights: {
          topRatedMovies,
          recentlyAdded
        },
        cache: cacheStats
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get genre statistics - GET /api/stats/genres
router.get('/genres', async (req, res) => {
  try {
    const genreStats = await Movie.aggregate([
      { $match: { cacheExpiry: { $gt: new Date() } } },
      { $unwind: '$genre' },
      { $group: { 
        _id: '$genre',
        count: { $sum: 1 },
        averageRating: { $avg: '$rating.imdb.score' },
        averageRuntime: { $avg: '$runtime' },
        totalVotes: { $sum: '$rating.imdb.votes' }
      }},
      { $sort: { count: -1 } },
      { $project: {
        genre: '$_id',
        count: 1,
        averageRating: { $round: ['$averageRating', 2] },
        averageRuntime: { $round: ['$averageRuntime', 0] },
        totalVotes: 1,
        _id: 0
      }}
    ]);

    res.json({
      success: true,
      data: genreStats
    });

  } catch (error) {
    console.error('Genre stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch genre statistics'
    });
  }
});

// Get yearly statistics - GET /api/stats/years
router.get('/years', async (req, res) => {
  try {
    const { startYear, endYear } = req.query;
    
    let matchCondition = { cacheExpiry: { $gt: new Date() } };
    
    if (startYear) matchCondition.year = { $gte: parseInt(startYear) };
    if (endYear) matchCondition.year = { ...matchCondition.year, $lte: parseInt(endYear) };

    const yearStats = await Movie.aggregate([
      { $match: matchCondition },
      { $group: { 
        _id: '$year',
        count: { $sum: 1 },
        averageRating: { $avg: '$rating.imdb.score' },
        averageRuntime: { $avg: '$runtime' },
        totalMovies: { $sum: 1 },
        highestRated: { $max: '$rating.imdb.score' },
        lowestRated: { $min: '$rating.imdb.score' }
      }},
      { $sort: { _id: 1 } },
      { $project: {
        year: '$_id',
        count: 1,
        averageRating: { $round: ['$averageRating', 2] },
        averageRuntime: { $round: ['$averageRuntime', 0] },
        totalMovies: 1,
        highestRated: { $round: ['$highestRated', 1] },
        lowestRated: { $round: ['$lowestRated', 1] },
        _id: 0
      }}
    ]);

    res.json({
      success: true,
      data: yearStats
    });

  } catch (error) {
    console.error('Year stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch year statistics'
    });
  }
});

// Get rating distribution - GET /api/stats/ratings
router.get('/ratings', async (req, res) => {
  try {
    const ratingDistribution = await Movie.aggregate([
      { $match: { 
        cacheExpiry: { $gt: new Date() },
        'rating.imdb.score': { $exists: true, $ne: null }
      }},
      { $bucket: {
        groupBy: '$rating.imdb.score',
        boundaries: [0, 2, 4, 6, 7, 8, 9, 10],
        default: 'other',
        output: {
          count: { $sum: 1 },
          averageVotes: { $avg: '$rating.imdb.votes' },
          movies: { $push: { title: '$title', rating: '$rating.imdb.score', imdbID: '$imdbID' } }
        }
      }},
      { $project: {
        range: {
          $switch: {
            branches: [
              { case: { $eq: ['$_id', 0] }, then: '0-2' },
              { case: { $eq: ['$_id', 2] }, then: '2-4' },
              { case: { $eq: ['$_id', 4] }, then: '4-6' },
              { case: { $eq: ['$_id', 6] }, then: '6-7' },
              { case: { $eq: ['$_id', 7] }, then: '7-8' },
              { case: { $eq: ['$_id', 8] }, then: '8-9' },
              { case: { $eq: ['$_id', 9] }, then: '9-10' }
            ],
            default: 'Other'
          }
        },
        count: 1,
        averageVotes: { $round: ['$averageVotes', 0] },
        topMovies: { $slice: [{ $sortArray: { input: '$movies', sortBy: { rating: -1 } } }, 3] },
        _id: 0
      }}
    ]);

    res.json({
      success: true,
      data: ratingDistribution
    });

  } catch (error) {
    console.error('Rating distribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rating distribution'
    });
  }
});

// Get director statistics - GET /api/stats/directors
router.get('/directors', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const directorStats = await Movie.aggregate([
      { $match: { cacheExpiry: { $gt: new Date() } } },
      { $unwind: '$director' },
      { $group: { 
        _id: '$director',
        movieCount: { $sum: 1 },
        averageRating: { $avg: '$rating.imdb.score' },
        totalVotes: { $sum: '$rating.imdb.votes' },
        movies: { $push: { title: '$title', year: '$year', rating: '$rating.imdb.score', imdbID: '$imdbID' } }
      }},
      { $match: { movieCount: { $gte: 2 } } }, // Directors with at least 2 movies
      { $sort: { averageRating: -1, movieCount: -1 } },
      { $limit: parseInt(limit) },
      { $project: {
        director: '$_id',
        movieCount: 1,
        averageRating: { $round: ['$averageRating', 2] },
        totalVotes: 1,
        topMovies: { $slice: [{ $sortArray: { input: '$movies', sortBy: { rating: -1 } } }, 3] },
        _id: 0
      }}
    ]);

    res.json({
      success: true,
      data: directorStats
    });

  } catch (error) {
    console.error('Director stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch director statistics'
    });
  }
});

// Get actor statistics - GET /api/stats/actors
router.get('/actors', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const actorStats = await Movie.aggregate([
      { $match: { cacheExpiry: { $gt: new Date() } } },
      { $unwind: '$actors' },
      { $group: { 
        _id: '$actors',
        movieCount: { $sum: 1 },
        averageRating: { $avg: '$rating.imdb.score' },
        totalVotes: { $sum: '$rating.imdb.votes' },
        genres: { $addToSet: { $arrayElemAt: ['$genre', 0] } },
        movies: { $push: { title: '$title', year: '$year', rating: '$rating.imdb.score', imdbID: '$imdbID' } }
      }},
      { $match: { movieCount: { $gte: 2 } } }, // Actors with at least 2 movies
      { $sort: { averageRating: -1, movieCount: -1 } },
      { $limit: parseInt(limit) },
      { $project: {
        actor: '$_id',
        movieCount: 1,
        averageRating: { $round: ['$averageRating', 2] },
        totalVotes: 1,
        genres: 1,
        topMovies: { $slice: [{ $sortArray: { input: '$movies', sortBy: { rating: -1 } } }, 3] },
        _id: 0
      }}
    ]);

    res.json({
      success: true,
      data: actorStats
    });

  } catch (error) {
    console.error('Actor stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch actor statistics'
    });
  }
});

// Get cache statistics (Admin only) - GET /api/stats/cache
router.get('/cache', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const cacheStats = await movieService.getCacheStats();
    
    // Additional cache metrics
    const [recentActivity, expiringToday, oldestEntries] = await Promise.all([
      Movie.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .select('title createdAt lastUpdated cacheExpiry')
        .lean(),
        
      Movie.countDocuments({
        cacheExpiry: {
          $gte: new Date(),
          $lt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      }),
      
      Movie.find({})
        .sort({ createdAt: 1 })
        .limit(5)
        .select('title createdAt lastUpdated')
        .lean()
    ]);

    res.json({
      success: true,
      data: {
        ...cacheStats,
        recentActivity,
        expiringToday,
        oldestEntries
      }
    });

  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cache statistics'
    });
  }
});

// Get comprehensive analytics - GET /api/stats/analytics
router.get('/analytics', optionalAuth, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    // Calculate date range based on timeframe
    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case '7d':
        dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case '90d':
        dateFilter = { createdAt: { $gte: new Date(now - 90 * 24 * 60 * 60 * 1000) } };
        break;
      case 'all':
      default:
        dateFilter = {};
    }

    const [
      overview,
      trends,
      topPerformers
    ] = await Promise.all([
      // Overview statistics
      Movie.aggregate([
        { $match: { cacheExpiry: { $gt: new Date() }, ...dateFilter } },
        { $group: {
          _id: null,
          totalMovies: { $sum: 1 },
          averageRating: { $avg: '$rating.imdb.score' },
          averageRuntime: { $avg: '$runtime' },
          totalGenres: { $addToSet: { $arrayElemAt: ['$genre', 0] } },
          ratingRange: {
            $push: {
              $cond: [
                { $and: [
                  { $ne: ['$rating.imdb.score', null] },
                  { $ne: ['$rating.imdb.score', ''] }
                ]},
                '$rating.imdb.score',
                null
              ]
            }
          }
        }},
        { $project: {
          totalMovies: 1,
          averageRating: { $round: ['$averageRating', 2] },
          averageRuntime: { $round: ['$averageRuntime', 0] },
          uniqueGenres: { $size: '$totalGenres' },
          highestRating: { $max: '$ratingRange' },
          lowestRating: { $min: '$ratingRange' },
          _id: 0
        }}
      ]),

      // Trends over time
      Movie.aggregate([
        { $match: { cacheExpiry: { $gt: new Date() }, ...dateFilter } },
        { $group: {
          _id: {
            $dateToString: {
              format: timeframe === '7d' ? '%Y-%m-%d' : '%Y-%m',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 },
          averageRating: { $avg: '$rating.imdb.score' }
        }},
        { $sort: { _id: 1 } },
        { $project: {
          period: '$_id',
          count: 1,
          averageRating: { $round: ['$averageRating', 2] },
          _id: 0
        }}
      ]),

      // Top performers
      Movie.find({ 
        cacheExpiry: { $gt: new Date() },
        'rating.imdb.score': { $gte: 8.0 },
        ...dateFilter
      })
      .sort({ 'rating.imdb.score': -1, 'rating.imdb.votes': -1 })
      .limit(5)
      .select('title year rating.imdb.score genre imdbID')
      .lean()
    ]);

    // Get most popular genres separately
    const mostPopularGenres = await Movie.aggregate([
      { $match: { cacheExpiry: { $gt: new Date() }, ...dateFilter } },
      { $unwind: '$genre' },
      { $group: { _id: '$genre', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { genre: '$_id', count: 1, _id: 0 } }
    ]);

    res.json({
      success: true,
      data: {
        timeframe,
        overview: overview[0] || {},
        trends,
        topPerformers: {
          topRatedMovies: topPerformers,
          mostPopularGenres
        }
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
});

module.exports = router;