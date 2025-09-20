# MovieFlix Frontend

A modern React dashboard for movie discovery and analytics built with Tailwind CSS and Chart.js.

## Features

- **User Authentication** - JWT-based login/register with role management
- **Movie Search** - Search movies with advanced filters and pagination
- **Interactive Dashboard** - Charts showing genre distribution, ratings, and trends
- **Movie Details** - Comprehensive movie information pages
- **Dark Mode** - Toggle between light and dark themes
- **Responsive Design** - Mobile and desktop optimized
- **Profile Management** - Update user information and passwords

## Tech Stack

- **React 18** - Frontend framework
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Chart.js + React-Chartjs-2** - Interactive charts
- **Axios** - HTTP client for API calls
- **Lucide React** - Icon library

## Quick Start

### Prerequisites
- Node.js 14+
- Backend API running on port 5001

### Installation
```bash
# Clone and install
git clone <repository-url>
cd frontend
npm install

# Start development server
npm start
```

The app will open at `http://localhost:3000`

## Demo Accounts

- **Admin**: admin@movieflix.com / admin123
- **User**: user@movieflix.com / user123

## Project Structure

```
src/
├── components/
│   ├── auth/           # Authentication components
│   │   ├── Login.js
│   │   ├── Register.js
│   │   └── Profile.js
│   ├── movies/         # Movie-related components
│   │   ├── MovieSearch.js
│   │   └── MovieDetails.js
│   ├── dashboard/      # Dashboard and analytics
│   │   ├── Dashboard.js
│   │   └── Charts.js
│   └── common/         # Shared components
│       ├── Navbar.js
│       └── LoadingSpinner.js
├── contexts/
│   └── AuthContext.js  # Authentication state management
├── services/
│   └── api.js          # API service layer
├── hooks/
│   └── useTheme.js     # Dark mode hook
├── utils/
│   └── helpers.js      # Utility functions
└── App.js              # Main app component
```

## How It Works

### Authentication Flow
1. User enters credentials on login page
2. Frontend sends POST request to `/api/auth/login`
3. Backend validates and returns JWT token
4. Token stored in localStorage and added to all API requests
5. AuthContext manages authentication state across app
6. Protected routes redirect to login if not authenticated

### Movie Search & Discovery
1. User enters search term or applies filters
2. Frontend calls `/api/movies` with search parameters
3. Backend searches local cache first, then OMDB API if needed
4. Results displayed in responsive grid with pagination
5. Click on movie navigates to detailed view
6. Movie details fetched from `/api/movies/:id`

### Dashboard Analytics
1. Dashboard loads statistics from `/api/stats/dashboard`
2. Chart.js renders interactive visualizations:
   - Pie chart for genre distribution
   - Bar chart for average ratings by genre
   - Line chart for runtime trends by year
3. Real-time data updates when cache changes
4. Responsive charts adapt to screen size

### State Management
- **AuthContext**: Global authentication state
- **Local State**: Component-level state for forms and UI
- **API Layer**: Centralized HTTP requests with error handling
- **Theme State**: Dark/light mode preference persisted in localStorage

## API Integration

### Base Configuration
```javascript
// services/api.js
const API_BASE_URL = 'http://localhost:5001/api';

// Automatic token attachment
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Error Handling
- Network errors show user-friendly messages
- 401 responses automatically redirect to login
- Form validation prevents invalid submissions
- Loading states provide user feedback

### Caching Strategy
- JWT tokens cached in localStorage
- User preferences (theme) persisted locally
- API responses handled by backend caching
- Optimistic UI updates where appropriate

## Key Features Explained

### Dark Mode Implementation
```javascript
// hooks/useTheme.js
const [isDark, setIsDark] = useState(() => {
  const saved = localStorage.getItem('theme');
  if (saved) return saved === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
});
```

### Protected Routes
```javascript
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin()) return <Navigate to="/dashboard" />;
  
  return children;
};
```

### Search with Debouncing
```javascript
const debouncedSearch = debounce((term) => {
  searchMovies(term, { ...filters, page: 1 });
}, 500);
```

## Component Architecture

### Reusable Components
- **LoadingSpinner** - Consistent loading states
- **MovieCard** - Standardized movie display
- **Charts** - Configurable Chart.js wrappers

### Smart vs Presentational
- **Smart Components**: Handle state and API calls
- **Presentational Components**: Focus on UI rendering
- **Custom Hooks**: Extract reusable logic

### Error Boundaries
- Graceful error handling for API failures
- User-friendly error messages
- Retry mechanisms for failed requests

## Styling Approach

### Tailwind CSS Classes
```css
/* Component styles in index.css */
.btn-primary {
  @apply bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg;
}

.input-field {
  @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2;
}
```

### Responsive Design
- Mobile-first approach
- Grid layouts adapt to screen size
- Touch-friendly interface elements
- Optimized for tablets and phones

## Performance Optimizations

- **Code Splitting**: React.lazy for route-based splitting
- **Memoization**: Prevent unnecessary re-renders
- **Image Optimization**: Fallback for missing movie posters
- **Debounced Search**: Reduce API calls during typing

## Development Commands

```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
npm run eject      # Eject from Create React App
```

## Environment Variables

Create `.env` file:
```env
REACT_APP_API_URL=http://localhost:5001/api
```

## Build and Deployment

```bash
# Production build
npm run build

# The build folder contains optimized static files
# Deploy to any static hosting service
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow existing code structure
2. Use TypeScript for new components
3. Add proper error handling
4. Test responsive design
5. Update documentation

---

**Backend Integration**: This frontend connects to the MovieFlix backend API running on port 5001. Ensure the backend is running before starting the frontend development server.