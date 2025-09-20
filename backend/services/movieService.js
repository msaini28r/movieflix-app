const axios = require('axios');
const Movie = require('../models/Movie');

class MovieService {
  constructor() {
    console.log('OMDB API Key loaded:', process.env.OMDB_API_KEY ? 'YES' : 'NO');
    console.log('API Key value:', process.env.OMDB_API_KEY);
    this.omdbApiKey = process.env.OMDB_API_KEY;
    this.tmdbApiKey = process.env.TMDB_API_KEY;
    this.omdbBaseUrl = 'http://www.omdbapi.com/';
    this.tmdbBaseUrl = 'https://api.themoviedb.org/3';
  }

  // Search movies using OMDB API
  async searchMoviesOMDB(searchTerm, page = 1) {
    try {
      if (!this.omdbApiKey) {
        throw new Error('OMDB API key not configured');
      }

      const response = await axios.get(this.omdbBaseUrl, {
        params: {
          apikey: this.omdbApiKey,
          s: searchTerm,
          page: page,
          type: 'movie'
        },
        timeout: 10000
      });

      if (response.data.Response === 'False') {
        return {
          movies: [],
          totalResults: 0,
          error: response.data.Error
        };
      }

      return {
        movies: response.data.Search || [],
        totalResults: parseInt(response.data.totalResults) || 0,
        page: page
      };

    } catch (error) {
      console.error('OMDB search error:', error.message);
      throw new Error(`Failed to search movies: ${error.message}`);
    }
  }

  // Get detailed movie info from OMDB
  async getMovieDetailsOMDB(imdbId) {
    try {
      if (!this.omdbApiKey) {
        throw new Error('OMDB API key not configured');
      }

      const response = await axios.get(this.omdbBaseUrl, {
        params: {
          apikey: this.omdbApiKey,
          i: imdbId,
          plot: 'full'
        },
        timeout: 10000
      });

      if (response.data.Response === 'False') {
        throw new Error(response.data.Error || 'Movie not found');
      }

      return this.transformOMDBData(response.data);

    } catch (error) {
      console.error('OMDB details error:', error.message);
      throw new Error(`Failed to fetch movie details: ${error.message}`);
    }
  }

  // Transform OMDB data to our schema
  transformOMDBData(omdbMovie) {
    return {
      imdbID: omdbMovie.imdbID,
      title: omdbMovie.Title,
      year: parseInt(omdbMovie.Year) || null,
      released: omdbMovie.Released !== 'N/A' ? new Date(omdbMovie.Released) : null,
      runtime: this.parseRuntime(omdbMovie.Runtime),
      genre: omdbMovie.Genre !== 'N/A' ? omdbMovie.Genre.split(', ') : [],
      director: omdbMovie.Director !== 'N/A' ? omdbMovie.Director.split(', ') : [],
      writer: omdbMovie.Writer !== 'N/A' ? omdbMovie.Writer.split(', ') : [],
      actors: omdbMovie.Actors !== 'N/A' ? omdbMovie.Actors.split(', ') : [],
      plot: omdbMovie.Plot !== 'N/A' ? omdbMovie.Plot : '',
      language: omdbMovie.Language !== 'N/A' ? omdbMovie.Language.split(', ') : [],
      country: omdbMovie.Country !== 'N/A' ? omdbMovie.Country.split(', ') : [],
      rating: {
        imdb: {
          score: omdbMovie.imdbRating !== 'N/A' ? parseFloat(omdbMovie.imdbRating) : null,
          votes: omdbMovie.imdbVotes !== 'N/A' ? parseInt(omdbMovie.imdbVotes.replace(/,/g, '')) : null
        },
        rottenTomatoes: this.extractRating(omdbMovie.Ratings, 'Rotten Tomatoes'),
        metacritic: this.extractRating(omdbMovie.Ratings, 'Metacritic')
      },
      poster: omdbMovie.Poster !== 'N/A' ? omdbMovie.Poster : null,
      rated: omdbMovie.Rated !== 'N/A' ? omdbMovie.Rated : null,
      type: omdbMovie.Type || 'movie',
      links: {
        imdb: `https://www.imdb.com/title/${omdbMovie.imdbID}/`
      },
      source: 'omdb'
    };
  }

  // Parse runtime string to minutes
  parseRuntime(runtimeStr) {
    if (!runtimeStr || runtimeStr === 'N/A') return null;
    const match = runtimeStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  // Extract rating from ratings array
  extractRating(ratings, source) {
    if (!ratings || !Array.isArray(ratings)) return { score: null };
    
    const rating = ratings.find(r => r.Source === source);
    if (!rating) return { score: null };

    if (source === 'Rotten Tomatoes') {
      const match = rating.Value.match(/(\d+)%/);
      return { score: match ? parseInt(match[1]) : null };
    }
    
    if (source === 'Metacritic') {
      const match = rating.Value.match(/(\d+)/);
      return { score: match ? parseInt(match[1]) : null };
    }

    return { score: null };
  }

  // Save or update movie in database
  async saveMovieToCache(movieData) {
    try {
      const existingMovie = await Movie.findOne({ imdbID: movieData.imdbID });
      
      if (existingMovie) {
        // Update existing movie
        Object.assign(existingMovie, movieData);
        existingMovie.cacheExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        existingMovie.lastUpdated = new Date();
        return await existingMovie.save();
      } else {
        // Create new movie
        const movie = new Movie(movieData);
        return await movie.save();
      }
    } catch (error) {
      console.error('Error saving movie to cache:', error);
      throw new Error('Failed to save movie to database');
    }
  }

  // Search movies (check cache first, then API)
  async searchMovies(searchTerm, options = {}) {
    const { page = 1, useCache = true } = options;
    
    try {
      // If using cache, search local database first
      if (useCache) {
        const cachedMovies = await Movie.find({
          $text: { $search: searchTerm },
          cacheExpiry: { $gt: new Date() }
        })
        .limit(10)
        .sort({ score: { $meta: 'textScore' } })
        .lean();

        if (cachedMovies.length > 0) {
          return {
            movies: cachedMovies,
            totalResults: cachedMovies.length,
            source: 'cache',
            page: page
          };
        }
      }

      // If no cache results, fetch from API
      const apiResults = await this.searchMoviesOMDB(searchTerm, page);
      
      // Cache the search results
      if (apiResults.movies && apiResults.movies.length > 0) {
        const cachePromises = apiResults.movies.map(async (movie) => {
          try {
            // Get full details for each movie
            const fullDetails = await this.getMovieDetailsOMDB(movie.imdbID);
            await this.saveMovieToCache(fullDetails);
            return fullDetails;
          } catch (error) {
            console.error(`Failed to cache movie ${movie.imdbID}:`, error.message);
            return null;
          }
        });

        const cachedMovies = await Promise.allSettled(cachePromises);
        const successfulCaches = cachedMovies
          .filter(result => result.status === 'fulfilled' && result.value)
          .map(result => result.value);

        return {
          movies: successfulCaches,
          totalResults: apiResults.totalResults,
          source: 'api',
          page: page
        };
      }

      return apiResults;

    } catch (error) {
      console.error('Search movies error:', error);
      throw error;
    }
  }

  // Get movie by ID (check cache first)
  async getMovieById(imdbId) {
    try {
      // Check cache first
      let movie = await Movie.findOne({ 
        imdbID: imdbId,
        cacheExpiry: { $gt: new Date() }
      });

      if (movie) {
        return { movie, source: 'cache' };
      }

      // Fetch from API if not in cache or expired
      const movieData = await this.getMovieDetailsOMDB(imdbId);
      movie = await this.saveMovieToCache(movieData);

      return { movie, source: 'api' };

    } catch (error) {
      console.error('Get movie by ID error:', error);
      throw error;
    }
  }

  // Get all cached movies with filtering and sorting
  async getCachedMovies(options = {}) {
    const {
      search,
      genre,
      year,
      rating,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = options;

    try {
      let query = { cacheExpiry: { $gt: new Date() } };
      let sort = {};

      // Build search query
      if (search) {
        query.$text = { $search: search };
      }

      if (genre && genre.length > 0) {
        query.genre = { $in: Array.isArray(genre) ? genre : [genre] };
      }

      if (year) {
        if (typeof year === 'object') {
          if (year.min) query.year = { ...query.year, $gte: year.min };
          if (year.max) query.year = { ...query.year, $lte: year.max };
        } else {
          query.year = year;
        }
      }

      if (rating) {
        if (typeof rating === 'object') {
          if (rating.min) query['rating.imdb.score'] = { ...query['rating.imdb.score'], $gte: rating.min };
          if (rating.max) query['rating.imdb.score'] = { ...query['rating.imdb.score'], $lte: rating.max };
        } else {
          query['rating.imdb.score'] = { $gte: rating };
        }
      }

      // Build sort object
      const sortDirection = sortOrder === 'desc' ? -1 : 1;
      
      if (search && query.$text) {
        sort.score = { $meta: 'textScore' };
      } else {
        switch (sortBy) {
          case 'title':
            sort.title = sortDirection;
            break;
          case 'year':
            sort.year = sortDirection;
            break;
          case 'rating':
            sort['rating.imdb.score'] = sortDirection;
            break;
          case 'runtime':
            sort.runtime = sortDirection;
            break;
          default:
            sort.createdAt = sortDirection;
        }
      }

      const skip = (page - 1) * limit;
      
      const [movies, total] = await Promise.all([
        Movie.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Movie.countDocuments(query)
      ]);

      return {
        movies,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('Get cached movies error:', error);
      throw error;
    }
  }

  // Clean expired cache entries
  async cleanExpiredCache() {
    try {
      const result = await Movie.deleteMany({
        cacheExpiry: { $lt: new Date() }
      });
      
      console.log(`Cleaned ${result.deletedCount} expired cache entries`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning cache:', error);
      return 0;
    }
  }

  // Get cache statistics
  async getCacheStats() {
    try {
      const [total, expired, byGenre, byYear] = await Promise.all([
        Movie.countDocuments(),
        Movie.countDocuments({ cacheExpiry: { $lt: new Date() } }),
        Movie.aggregate([
          { $unwind: '$genre' },
          { $group: { _id: '$genre', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        Movie.aggregate([
          { $group: { _id: '$year', count: { $sum: 1 } } },
          { $sort: { _id: -1 } },
          { $limit: 10 }
        ])
      ]);

      return {
        total,
        active: total - expired,
        expired,
        topGenres: byGenre,
        moviesByYear: byYear
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      throw error;
    }
  }
}

module.exports = new MovieService();