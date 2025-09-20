import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { statsAPI, handleAPIError } from '../../services/api';
import { formatRating, formatRuntime } from '../../utils/helpers';
import { GenreDistributionChart, RatingsByGenreChart, RuntimeByYearChart } from './Charts';
import LoadingSpinner from '../common/LoadingSpinner';
import { 
  BarChart3, 
  Film, 
  Star, 
  Clock, 
  TrendingUp, 
  Users,
  Database,
  Activity
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await statsAPI.getDashboard();
      setDashboardData(response.data.data);
    } catch (err) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle }) => (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400 mt-2`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 bg-${color}-100 dark:bg-${color}-900/20 rounded-lg`}>
          <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
    </div>
  );

  const MovieCard = ({ movie, rank }) => (
    <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-dark-700 rounded-lg transition-colors">
      <div className="flex-shrink-0 w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
        <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
          {rank}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {movie.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {movie.year} • {movie.genre?.join(', ')}
        </p>
      </div>
      <div className="flex items-center space-x-1">
        <Star className="w-4 h-4 text-yellow-400 fill-current" />
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {formatRating(movie.rating?.imdb?.score)}
        </span>
      </div>
    </div>
  );

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">No dashboard data available</p>
      </div>
    );
  }

  const { charts, highlights, cache } = dashboardData;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Here's what's happening with your MovieFlix dashboard
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={fetchDashboardData}
            className="btn-secondary flex items-center space-x-2"
          >
            <Activity className="w-4 h-4" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Movies"
          value={cache?.total || 0}
          icon={Film}
          color="blue"
          subtitle="In database"
        />
        <StatCard
          title="Active Cache"
          value={cache?.active || 0}
          icon={Database}
          color="green"
          subtitle="Currently cached"
        />
        <StatCard
          title="Top Genres"
          value={charts?.genreDistribution?.length || 0}
          icon={BarChart3}
          color="purple"
          subtitle="Different genres"
        />
        <StatCard
          title="Avg Rating"
          value={highlights?.topRatedMovies?.length > 0 ? 
            formatRating(highlights.topRatedMovies.reduce((sum, movie) => 
              sum + (movie.rating?.imdb?.score || 0), 0) / highlights.topRatedMovies.length
            ) : 'N/A'
          }
          icon={Star}
          color="yellow"
          subtitle="Top movies avg"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Genre Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Genre Distribution
          </h3>
          <GenreDistributionChart data={charts?.genreDistribution} />
        </div>

        {/* Ratings by Genre */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Average Ratings by Genre
          </h3>
          <RatingsByGenreChart data={charts?.ratingsByGenre} />
        </div>

        {/* Runtime by Year */}
        <div className="card p-6 lg:col-span-2 xl:col-span-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Runtime Trends
          </h3>
          <RuntimeByYearChart data={charts?.runtimeByYear} />
        </div>
      </div>

      {/* Highlights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Rated Movies */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top Rated Movies
            </h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="space-y-2">
            {highlights?.topRatedMovies?.slice(0, 5).map((movie, index) => (
              <MovieCard key={movie.imdbID} movie={movie} rank={index + 1} />
            )) || (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No movies available
              </p>
            )}
          </div>
        </div>

        {/* Recently Added */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recently Added
            </h3>
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <div className="space-y-2">
            {highlights?.recentlyAdded?.map((movie, index) => (
              <div key={movie.imdbID} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-dark-700 rounded-lg transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {movie.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {movie.year} • Added {new Date(movie.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formatRating(movie.rating?.imdb?.score)}
                  </span>
                </div>
              </div>
            )) || (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No recent movies
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cache Information */}
      {cache && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Cache Information
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {cache.total}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Movies</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {cache.active}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {cache.expired}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Expired</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round((cache.active / cache.total) * 100)}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Cache Hit Rate</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;