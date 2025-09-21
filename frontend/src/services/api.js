import axios from "axios";

// Base API configuration
const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://movieflix-app-production.up.railway.app/api"
    : "http://localhost:5001/api");

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout for production
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false, // Set to false for CORS in production
});

// Log API URL in development
if (process.env.NODE_ENV === "development") {
  console.log("API Base URL:", API_BASE_URL);
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post("/auth/register", userData),
  login: (credentials) => api.post("/auth/login", credentials),
  logout: () => api.post("/auth/logout"),
  getProfile: () => api.get("/auth/profile"),
  updateProfile: (userData) => api.put("/auth/profile", userData),
  changePassword: (passwordData) =>
    api.put("/auth/change-password", passwordData),
  refreshToken: (refreshToken) => api.post("/auth/refresh", { refreshToken }),
};

// Movies API
export const moviesAPI = {
  searchMovies: (params) => {
    const searchParams = new URLSearchParams();

    if (params.search) searchParams.append("search", params.search);
    if (params.genre) searchParams.append("genre", params.genre);
    if (params.year) searchParams.append("year", params.year);
    if (params.rating) searchParams.append("rating", params.rating);
    if (params.sort) searchParams.append("sort", params.sort);
    if (params.order) searchParams.append("order", params.order);
    if (params.page) searchParams.append("page", params.page);
    if (params.limit) searchParams.append("limit", params.limit);

    return api.get(`/movies?${searchParams.toString()}`);
  },

  getMovieById: (id) => api.get(`/movies/${id}`),
  getGenres: () => api.get("/movies/meta/genres"),
  getYears: () => api.get("/movies/meta/years"),
  exportCSV: () => api.get("/movies/export/csv", { responseType: "blob" }),

  // Admin endpoints
  deleteMovie: (id) => api.delete(`/movies/${id}`),
  updateMovie: (id) => api.put(`/movies/${id}`),
  clearExpiredCache: () => api.delete("/movies/cache/expired"),
  clearAllCache: () => api.delete("/movies/cache/all"),
};

// Stats API
export const statsAPI = {
  getDashboard: () => api.get("/stats/dashboard"),
  getGenres: () => api.get("/stats/genres"),
  getYears: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.startYear) searchParams.append("startYear", params.startYear);
    if (params.endYear) searchParams.append("endYear", params.endYear);
    return api.get(`/stats/years?${searchParams.toString()}`);
  },
  getRatings: () => api.get("/stats/ratings"),
  getDirectors: (limit = 20) => api.get(`/stats/directors?limit=${limit}`),
  getActors: (limit = 20) => api.get(`/stats/actors?limit=${limit}`),
  getCache: () => api.get("/stats/cache"), // Admin only
  getAnalytics: (timeframe = "30d") =>
    api.get(`/stats/analytics?timeframe=${timeframe}`),
};

// Health check
export const healthAPI = {
  check: () => api.get("/health"),
};

// Helper function to handle API errors
export const handleAPIError = (error) => {
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.message || "An error occurred";
    return {
      message,
      status: error.response.status,
      data: error.response.data,
    };
  } else if (error.request) {
    // Request made but no response
    return {
      message: "Network error. Please check your connection.",
      status: 0,
    };
  } else {
    // Something else happened
    return {
      message: error.message || "An unexpected error occurred",
      status: 0,
    };
  }
};

export default api;
