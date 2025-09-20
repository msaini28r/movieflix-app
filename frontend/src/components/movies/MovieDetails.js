import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { moviesAPI, handleAPIError } from '../../services/api';
import { formatRating, formatRuntime, formatDate, getIMDbUrl } from '../../utils/helpers';
import LoadingSpinner from '../common/LoadingSpinner';
import { 
  ArrowLeft, 
  Star, 
  Calendar, 
  Clock, 
  Globe, 
  ExternalLink,
  Users,
  Film
} from 'lucide-react';

const MovieDetails = () => {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMovieDetails();
  }, [id]);

  const fetchMovieDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await moviesAPI.getMovieById(id);
      setMovie(response.data.data);
    } catch (err) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading movie details..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <div className="space-x-4">
            <button onClick={fetchMovieDetails} className="btn-primary">
              Try Again
            </button>
            <Link to="/movies" className="btn-secondary">
              Back to Movies
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Movie not found</p>
        <Link to="/movies" className="btn-primary mt-4">
          Back to Movies
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        to="/movies"
        className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Movies</span>
      </Link>

      {/* Movie Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Poster */}
        <div className="lg:col-span-1">
          <div className="card overflow-hidden">
            <img
              src={movie.poster && movie.poster !== 'N/A' ? movie.poster : '/placeholder-movie.jpg'}
              alt={movie.title}
              className="w-full h-auto object-cover"
              onError={(e) => {
                e.target.src = '/placeholder-movie.jpg';
              }}
            />
          </div>
        </div>

        {/* Movie Info */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {movie.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{movie.year}</span>
              </div>
              {movie.runtime && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatRuntime(movie.runtime)}</span>
                </div>
              )}
              {movie.rated && (
                <span className="px-2 py-1 bg-gray-200 dark:bg-dark-700 rounded text-sm font-medium">
                  {movie.rated}
                </span>
              )}
            </div>
          </div>

          {/* Ratings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ratings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {movie.rating?.imdb?.score && (
                <div className="card p-4 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatRating(movie.rating.imdb.score)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    IMDb ({movie.rating.imdb.votes?.toLocaleString()} votes)
                  </p>
                </div>
              )}
              {movie.rating?.rottenTomatoes?.score && (
                <div className="card p-4 text-center">
                  <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {movie.rating.rottenTomatoes.score}%
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Rotten Tomatoes
                  </p>
                </div>
              )}
              {movie.rating?.metacritic?.score && (
                <div className="card p-4 text-center">
                  <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {movie.rating.metacritic.score}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Metacritic
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Genres */}
          {movie.genre && movie.genre.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {movie.genre.map((genre, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 rounded-full text-sm font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Plot */}
          {movie.plot && movie.plot !== 'N/A' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Plot</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {movie.plot}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cast and Crew */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Director */}
        {movie.director && movie.director.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
              <Film className="w-5 h-5" />
              <span>Director{movie.director.length > 1 ? 's' : ''}</span>
            </h3>
            <div className="space-y-2">
              {movie.director.map((director, index) => (
                <p key={index} className="text-gray-700 dark:text-gray-300">
                  {director}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Cast */}
        {movie.actors && movie.actors.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Cast</span>
            </h3>
            <div className="space-y-2">
              {movie.actors.map((actor, index) => (
                <p key={index} className="text-gray-700 dark:text-gray-300">
                  {actor}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Production Details */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Production Details
          </h3>
          <div className="space-y-3">
            {movie.released && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Release Date:</span>
                <span className="text-gray-900 dark:text-white">{formatDate(movie.released)}</span>
              </div>
            )}
            {movie.language && movie.language.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Language:</span>
                <span className="text-gray-900 dark:text-white">{movie.language.join(', ')}</span>
              </div>
            )}
            {movie.country && movie.country.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Country:</span>
                <span className="text-gray-900 dark:text-white">{movie.country.join(', ')}</span>
              </div>
            )}
            {movie.writer && movie.writer.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Writer:</span>
                <span className="text-gray-900 dark:text-white">{movie.writer.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* External Links */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            External Links
          </h3>
          <div className="space-y-3">
            {movie.links?.imdb && (
              <a
                href={movie.links.imdb}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
              >
                <span className="font-medium text-gray-900 dark:text-white">View on IMDb</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
            )}
            {movie.imdbID && (
              <a
                href={getIMDbUrl(movie.imdbID)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
              >
                <span className="font-medium text-gray-900 dark:text-white">IMDb Page</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetails;