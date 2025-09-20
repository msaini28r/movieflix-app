const cron = require('node-cron');
const movieService = require('../services/movieService');
const Movie = require('../models/Movie');

// Cache cleanup job - runs every day at 2 AM
const setupCacheCleanup = () => {
  console.log('Setting up cache cleanup job...');
  
  // Run cleanup every day at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Starting scheduled cache cleanup...');
    
    try {
      const deletedCount = await movieService.cleanExpiredCache();
      console.log(`Cache cleanup completed: ${deletedCount} expired entries removed`);
      
      // Log cache statistics after cleanup
      const stats = await movieService.getCacheStats();
      console.log(`Cache stats after cleanup:`, {
        total: stats.total,
        active: stats.active,
        expired: stats.expired
      });
      
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }, {
    timezone: 'UTC'
  });

  // Optional: Run cleanup every 6 hours during development
  if (process.env.NODE_ENV === 'development') {
    cron.schedule('0 */6 * * *', async () => {
      console.log('Development cache cleanup...');
      try {
        const deletedCount = await movieService.cleanExpiredCache();
        console.log(`Development cleanup: ${deletedCount} entries removed`);
      } catch (error) {
        console.error('Development cleanup failed:', error);
      }
    });
  }
};

// Manual cleanup function
const runManualCleanup = async () => {
  try {
    console.log('Running manual cache cleanup...');
    
    const before = await Movie.countDocuments();
    const deletedCount = await movieService.cleanExpiredCache();
    const after = await Movie.countDocuments();
    
    console.log(`Manual cleanup completed:`);
    console.log(`- Before: ${before} entries`);
    console.log(`- Deleted: ${deletedCount} expired entries`);
    console.log(`- After: ${after} entries`);
    
    return { before, deleted: deletedCount, after };
    
  } catch (error) {
    console.error('Manual cleanup failed:', error);
    throw error;
  }
};

// Cleanup by criteria
const cleanupByCriteria = async (criteria = {}) => {
  try {
    const {
      olderThan, // Date
      rating, // { min, max }
      genre, // Array of genres to exclude
      year // { min, max }
    } = criteria;

    let query = {};
    
    if (olderThan) {
      query.createdAt = { $lt: olderThan };
    }
    
    if (rating) {
      if (rating.min) query['rating.imdb.score'] = { $lt: rating.min };
      if (rating.max) query['rating.imdb.score'] = { ...query['rating.imdb.score'], $gt: rating.max };
    }
    
    if (genre && genre.length > 0) {
      query.genre = { $nin: genre };
    }
    
    if (year) {
      if (year.min) query.year = { $lt: year.min };
      if (year.max) query.year = { ...query.year, $gt: year.max };
    }

    const result = await Movie.deleteMany(query);
    
    console.log(`Criteria-based cleanup completed: ${result.deletedCount} entries removed`);
    console.log('Criteria used:', criteria);
    
    return result.deletedCount;
    
  } catch (error) {
    console.error('Criteria-based cleanup failed:', error);
    throw error;
  }
};

// Get cleanup statistics
const getCleanupStats = async () => {
  try {
    const [total, expired, oldEntries, lowRated] = await Promise.all([
      Movie.countDocuments(),
      Movie.countDocuments({ cacheExpiry: { $lt: new Date() } }),
      Movie.countDocuments({ 
        createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      Movie.countDocuments({ 
        'rating.imdb.score': { $lt: 5.0 }
      })
    ]);

    return {
      total,
      expired,
      oldEntries,
      lowRated,
      active: total - expired
    };
    
  } catch (error) {
    console.error('Error getting cleanup stats:', error);
    throw error;
  }
};

module.exports = {
  setupCacheCleanup,
  runManualCleanup,
  cleanupByCriteria,
  getCleanupStats
};