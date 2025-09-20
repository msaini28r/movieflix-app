import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { moviesAPI, handleAPIError } from '../../services/api';
import { formatRating, formatYear, formatGenres, debounce } from '../../utils/helpers';
import LoadingSpinner from '../common/LoadingSpinner';
import { Search, Filter, Star, Calendar, Clock, Download, FileText } from 'lucide-react';

const MovieSearch = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    genre: '',
    year: '',
    rating: '',
    sort: 'rating',
    order: 'desc'
  });
  const [genres, setGenres] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [downloadLoading, setDownloadLoading] = useState(false);

  // CSV download function
  const downloadCSV = async () => {
    try {
      setDownloadLoading(true);
      
      // Get all movies based on current search/filters
      const allMoviesParams = {
        search: searchTerm,
        ...filters,
        limit: pagination.total || 1000, // Get all results
        page: 1
      };
      
      const response = await moviesAPI.searchMovies(allMoviesParams);
      const allMovies = response.data.data || [];
      
      if (allMovies.length === 0) {
        alert('No movies to download');
        return;
      }
      
      // Create CSV content
      const csvHeaders = [
        'Title',
        'Year',
        'Genre',
        'Director',
        'Actors',
        'IMDB Rating',
        'Runtime (minutes)',
        'Plot',
        'Language',
        'Country',
        'IMDB ID'
      ];
      
      const csvRows = allMovies.map(movie => [
        `"${(movie.title || '').replace(/"/g, '""')}"`,
        movie.year || '',
        `"${formatGenres(movie.genre).replace(/"/g, '""')}"`,
        `"${(movie.director ? movie.director.join(', ') : '').replace(/"/g, '""')}"`,
        `"${(movie.actors ? movie.actors.join(', ') : '').replace(/"/g, '""')}"`,
        movie.rating?.imdb?.score || '',
        movie.runtime || '',
        `"${(movie.plot || '').replace(/"/g, '""')}"`,
        `"${(movie.language ? movie.language.join(', ') : '').replace(/"/g, '""')}"`,
        `"${(movie.country ? movie.country.join(', ') : '').replace(/"/g, '""')}"`,
        movie.imdbID || ''
      ]);
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `movieflix-movies-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download CSV. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Debounced search function
  const debouncedSearch = debounce((term) => {
    searchMovies(term, { ...filters, page: 1 });
  }, 500);

  useEffect(() => {
    fetchGenres();
    // Load initial movies if no search term
    if (!searchTerm) {
      searchMovies('', filters);
    }
  }, []);

  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm);
    }
  }, [searchTerm]);

  const fetchGenres = async () => {
    try {
      const response = await moviesAPI.getGenres();
      setGenres(response.data.data || []);
    } catch (err) {
      console.error('Error fetching genres:', err);
    }
  };

  const searchMovies = async (search = searchTerm, searchFilters = filters) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        search,
        ...searchFilters,
        page: searchFilters.page || 1
      };

      const response = await moviesAPI.searchMovies(params);
      const { data, pagination: paginationData } = response.data;

      setMovies(data || []);
      setPagination(paginationData || {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      });
    } catch (err) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value, page: 1 };
    setFilters(newFilters);
    searchMovies(searchTerm, newFilters);
  };

  const handlePageChange = (newPage) => {
    const newFilters = { ...filters, page: newPage };
    setFilters(newFilters);
    searchMovies(searchTerm, newFilters);
  };

  const MovieCard = ({ movie }) => (
    <Link
      to={`/movies/${movie.imdbID}`}
      className="card hover:shadow-lg transition-shadow duration-200 overflow-hidden"
    >
      <div className="aspect-w-2 aspect-h-3 bg-gray-200 dark:bg-dark-700">
        <img
          src={movie.poster && movie.poster !== 'N/A' ? movie.poster : '/placeholder-movie.jpg'}
          alt={movie.title}
          className="w-full h-48 object-cover"
          onError={(e) => {
            e.target.src = '/placeholder-movie.jpg';
          }}
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {movie.title}
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{formatYear(movie.year)}</span>
            </div>
            {movie.rating?.imdb?.score && (
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatRating(movie.rating.imdb.score)}
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {formatGenres(movie.genre)}
          </p>
          {movie.runtime && (
            <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{movie.runtime} min</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Movie Search
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Discover and explore movies from our database
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
            placeholder="Search for movies..."
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.genre}
            onChange={(e) => handleFilterChange('genre', e.target.value)}
            className="input-field"
          >
            <option value="">All Genres</option>
            {genres.map((genre) => (
              <option key={genre.genre} value={genre.genre}>
                {genre.genre} ({genre.count})
              </option>
            ))}
          </select>

          <select
            value={filters.year}
            onChange={(e) => handleFilterChange('year', e.target.value)}
            className="input-field"
          >
            <option value="">Any Year</option>
            {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select
            value={filters.rating}
            onChange={(e) => handleFilterChange('rating', e.target.value)}
            className="input-field"
          >
            <option value="">Any Rating</option>
            <option value="9">9.0+ Excellent</option>
            <option value="8">8.0+ Very Good</option>
            <option value="7">7.0+ Good</option>
            <option value="6">6.0+ Decent</option>
            <option value="5">5.0+ Average</option>
          </select>

          <select
            value={`${filters.sort}-${filters.order}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split('-');
              setFilters(prev => ({ ...prev, sort, order }));
              searchMovies(searchTerm, { ...filters, sort, order });
            }}
            className="input-field"
          >
            <option value="rating-desc">Rating: High to Low</option>
            <option value="rating-asc">Rating: Low to High</option>
            <option value="year-desc">Year: Newest First</option>
            <option value="year-asc">Year: Oldest First</option>
            <option value="title-asc">Title: A to Z</option>
            <option value="title-desc">Title: Z to A</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner text="Searching movies..." />
      ) : error ? (
        <div className="text-center py-12">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={() => searchMovies()}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Results Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <p className="text-gray-600 dark:text-gray-400">
              {pagination.total > 0 ? (
                <>
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} movies
                </>
              ) : (
                'No movies found'
              )}
            </p>
            
            {/* Download CSV Button */}
            {movies.length > 0 && (
              <button
                onClick={downloadCSV}
                disabled={downloadLoading}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {downloadLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{downloadLoading ? 'Downloading...' : 'Download CSV'}</span>
              </button>
            )}
          </div>

          {/* Movies Grid */}
          {movies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {movies.map((movie) => (
                <MovieCard key={movie.imdbID} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No movies found. Try adjusting your search or filters.
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-8 space-y-4 sm:space-y-0">
              {/* Pagination Info */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>

              {/* Pagination Controls */}
              <nav className="flex items-center space-x-2">
                {/* First Page */}
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark-700"
                >
                  First
                </button>

                {/* Previous Page */}
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark-700"
                >
                  Previous
                </button>
                
                {/* Page Numbers */}
                {(() => {
                  const pages = [];
                  const maxVisible = 5;
                  const halfVisible = Math.floor(maxVisible / 2);
                  
                  let start = Math.max(1, pagination.page - halfVisible);
                  let end = Math.min(pagination.pages, start + maxVisible - 1);
                  
                  if (end - start + 1 < maxVisible) {
                    start = Math.max(1, end - maxVisible + 1);
                  }
                  
                  // Add ellipsis at start if needed
                  if (start > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => handlePageChange(1)}
                        className="px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700"
                      >
                        1
                      </button>
                    );
                    if (start > 2) {
                      pages.push(
                        <span key="ellipsis1" className="px-2 text-gray-500">...</span>
                      );
                    }
                  }
                  
                  // Add visible page numbers
                  for (let i = start; i <= end; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => handlePageChange(i)}
                        className={`px-3 py-2 text-sm border rounded-lg ${
                          pagination.page === i
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'border-gray-300 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-700'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  
                  // Add ellipsis at end if needed
                  if (end < pagination.pages) {
                    if (end < pagination.pages - 1) {
                      pages.push(
                        <span key="ellipsis2" className="px-2 text-gray-500">...</span>
                      );
                    }
                    pages.push(
                      <button
                        key={pagination.pages}
                        onClick={() => handlePageChange(pagination.pages)}
                        className="px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700"
                      >
                        {pagination.pages}
                      </button>
                    );
                  }
                  
                  return pages;
                })()}

                {/* Next Page */}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark-700"
                >
                  Next
                </button>

                {/* Last Page */}
                <button
                  onClick={() => handlePageChange(pagination.pages)}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark-700"
                >
                  Last
                </button>
              </nav>

              {/* Page Size Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Show:</span>
                <select
                  value={pagination.limit}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value);
                    const newFilters = { ...filters, limit: newLimit, page: 1 };
                    setFilters(newFilters);
                    searchMovies(searchTerm, newFilters);
                  }}
                  className="input-field w-20 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MovieSearch;