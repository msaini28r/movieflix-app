// Format functions
export const formatRating = (rating) => {
  if (!rating || rating === 0) return "N/A";
  return rating.toFixed(1);
};

export const formatRuntime = (runtime) => {
  if (!runtime) return "N/A";
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const formatYear = (year) => {
  if (!year) return "N/A";
  return year.toString();
};

export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return "N/A";
  }
};

export const formatGenres = (genres) => {
  if (!genres || !Array.isArray(genres)) return "N/A";
  return genres.join(", ");
};

export const formatCast = (cast, limit = 3) => {
  if (!cast || !Array.isArray(cast)) return "N/A";
  const limitedCast = cast.slice(0, limit);
  return limitedCast.join(", ") + (cast.length > limit ? "..." : "");
};

// URL and image helpers
export const getImageUrl = (posterUrl, fallback = "/placeholder-movie.jpg") => {
  if (!posterUrl || posterUrl === "N/A") return fallback;
  return posterUrl;
};

export const getIMDbUrl = (imdbId) => {
  if (!imdbId) return "#";
  return `https://www.imdb.com/title/${imdbId}/`;
};

// Search and filter helpers
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= 1900; year--) {
    years.push(year);
  }
  return years;
};

export const ratingRanges = [
  { label: "Any Rating", value: "" },
  { label: "9.0+ Excellent", value: 9.0 },
  { label: "8.0+ Very Good", value: 8.0 },
  { label: "7.0+ Good", value: 7.0 },
  { label: "6.0+ Decent", value: 6.0 },
  { label: "5.0+ Average", value: 5.0 },
];

// Validation helpers
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validateRequired = (value) => {
  return value && value.trim().length > 0;
};

// Local storage helpers
export const getFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

// Error handling
export const getErrorMessage = (error) => {
  if (typeof error === "string") return error;
  if (error?.message) return error.message;
  if (error?.response?.data?.message) return error.response.data.message;
  return "An unexpected error occurred";
};

// Enhanced error handling with user-friendly messages
export const handleApiError = (error) => {
  // Network errors
  if (!error.response) {
    return {
      message:
        "Unable to connect to the server. Please check your internet connection and try again.",
      type: "network",
      status: 0,
    };
  }

  const status = error.response.status;
  const data = error.response.data;

  // Server errors (5xx)
  if (status >= 500) {
    return {
      message:
        "Our servers are experiencing issues. Please try again in a few moments.",
      type: "server",
      status,
    };
  }

  // Client errors (4xx)
  switch (status) {
    case 400:
      return {
        message:
          data?.message ||
          "Invalid request. Please check your input and try again.",
        type: "validation",
        status,
      };
    case 401:
      return {
        message: "Please log in to access this feature.",
        type: "auth",
        status,
      };
    case 403:
      return {
        message: "You don't have permission to perform this action.",
        type: "permission",
        status,
      };
    case 404:
      return {
        message: "The requested resource could not be found.",
        type: "notfound",
        status,
      };
    case 429:
      return {
        message: "Too many requests. Please wait a moment and try again.",
        type: "ratelimit",
        status,
      };
    default:
      return {
        message: data?.message || "Something went wrong. Please try again.",
        type: "unknown",
        status,
      };
  }
};

// Retry logic for failed requests
export const retryApiCall = async (apiCall, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Don't retry for client errors (4xx)
      if (
        error.response &&
        error.response.status >= 400 &&
        error.response.status < 500
      ) {
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }
};

// Chart data helpers
export const generateChartColors = (count) => {
  const colors = [
    "#3B82F6",
    "#EF4444",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#F97316",
    "#06B6D4",
    "#84CC16",
    "#EC4899",
    "#6B7280",
  ];

  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  return result;
};

export const formatChartData = (data, labelKey, valueKey) => {
  if (!data || !Array.isArray(data)) return { labels: [], datasets: [] };

  const labels = data.map((item) => item[labelKey]);
  const values = data.map((item) => item[valueKey]);
  const colors = generateChartColors(data.length);

  return {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderColor: colors.map((color) => color + "80"),
        borderWidth: 1,
      },
    ],
  };
};

// Pagination helpers
export const getPaginationInfo = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return {
    totalPages,
    startItem,
    endItem,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

export const generatePageNumbers = (
  currentPage,
  totalPages,
  maxVisible = 5
) => {
  const pages = [];
  const halfVisible = Math.floor(maxVisible / 2);

  let start = Math.max(1, currentPage - halfVisible);
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return pages;
};
