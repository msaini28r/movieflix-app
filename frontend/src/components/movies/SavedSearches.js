import React, { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck, Trash2, Search } from 'lucide-react';

const SavedSearches = ({ currentSearch, onLoadSearch }) => {
  const [savedSearches, setSavedSearches] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [searchName, setSearchName] = useState('');

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = () => {
    try {
      const saved = localStorage.getItem('movieflix-saved-searches');
      if (saved) {
        setSavedSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved searches:', error);
    }
  };

  const saveCurrentSearch = () => {
    if (!searchName.trim()) return;

    const newSearch = {
      id: Date.now(),
      name: searchName.trim(),
      search: currentSearch,
      createdAt: new Date().toISOString()
    };

    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    localStorage.setItem('movieflix-saved-searches', JSON.stringify(updated));
    
    setSearchName('');
    setShowSaveModal(false);
  };

  const deleteSearch = (id) => {
    const updated = savedSearches.filter(search => search.id !== id);
    setSavedSearches(updated);
    localStorage.setItem('movieflix-saved-searches', JSON.stringify(updated));
  };

  const hasCurrentSearch = () => {
    return currentSearch.search || currentSearch.genre || currentSearch.year || currentSearch.rating;
  };

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Saved Searches
        </h3>
        {hasCurrentSearch() && (
          <button
            onClick={() => setShowSaveModal(true)}
            className="btn-secondary text-sm flex items-center space-x-1"
          >
            <Bookmark className="w-4 h-4" />
            <span>Save Current</span>
          </button>
        )}
      </div>

      {savedSearches.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
          No saved searches yet. Use the save button to bookmark your searches.
        </p>
      ) : (
        <div className="space-y-2">
          {savedSearches.map((search) => (
            <div
              key={search.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {search.name}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {search.search.search && `"${search.search.search}"`}
                  {search.search.genre && ` • ${search.search.genre}`}
                  {search.search.year && ` • ${search.search.year}`}
                  {search.search.rating && ` • ${search.search.rating}+ rating`}
                </p>
              </div>
              <div className="flex items-center space-x-2 ml-3">
                <button
                  onClick={() => onLoadSearch(search.search)}
                  className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                  title="Load search"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteSearch(search.id)}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  title="Delete search"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save Search Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Save Search
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="searchName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Name
                </label>
                <input
                  id="searchName"
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="input-field"
                  placeholder="Enter a name for this search"
                  autoFocus
                />
              </div>
              <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current search:</p>
                <div className="text-sm text-gray-900 dark:text-white">
                  {currentSearch.search && <div>Term: "{currentSearch.search}"</div>}
                  {currentSearch.genre && <div>Genre: {currentSearch.genre}</div>}
                  {currentSearch.year && <div>Year: {currentSearch.year}</div>}
                  {currentSearch.rating && <div>Rating: {currentSearch.rating}+</div>}
                  {currentSearch.sort && <div>Sort: {currentSearch.sort} ({currentSearch.order})</div>}
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCurrentSearch}
                  disabled={!searchName.trim()}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedSearches;