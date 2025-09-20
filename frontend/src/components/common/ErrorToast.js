import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Wifi, Server, Shield, Search } from 'lucide-react';

const ErrorToast = ({ error, onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Allow fade animation
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getErrorDetails = (error) => {
    // Network errors
    if (!error.response) {
      return {
        title: 'Connection Problem',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        icon: Wifi,
        color: 'orange'
      };
    }

    // Server errors
    if (error.response.status >= 500) {
      return {
        title: 'Server Error',
        message: 'Our servers are experiencing issues. Please try again in a few moments.',
        icon: Server,
        color: 'red'
      };
    }

    // Authentication errors
    if (error.response.status === 401) {
      return {
        title: 'Authentication Required',
        message: 'Please log in to access this feature.',
        icon: Shield,
        color: 'yellow'
      };
    }

    // Forbidden errors
    if (error.response.status === 403) {
      return {
        title: 'Access Denied',
        message: 'You don\'t have permission to perform this action.',
        icon: Shield,
        color: 'red'
      };
    }

    // Not found errors
    if (error.response.status === 404) {
      return {
        title: 'Not Found',
        message: 'The requested resource could not be found.',
        icon: Search,
        color: 'blue'
      };
    }

    // Rate limit errors
    if (error.response.status === 429) {
      return {
        title: 'Too Many Requests',
        message: 'You\'re making requests too quickly. Please wait a moment and try again.',
        icon: AlertCircle,
        color: 'orange'
      };
    }

    // Default error
    return {
      title: 'Something went wrong',
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      icon: AlertCircle,
      color: 'red'
    };
  };

  const { title, message, icon: Icon, color } = getErrorDetails(error);

  const colorClasses = {
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`border rounded-lg p-4 shadow-lg ${colorClasses[color]}`}>
        <div className="flex items-start space-x-3">
          <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-sm">{title}</h4>
            <p className="text-sm mt-1 opacity-90">{message}</p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="flex-shrink-0 p-1 hover:bg-black/10 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast container for managing multiple toasts
export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ErrorToast
          key={toast.id}
          error={toast.error}
          onClose={() => removeToast(toast.id)}
          duration={toast.duration}
        />
      ))}
    </div>
  );
};

export default ErrorToast;