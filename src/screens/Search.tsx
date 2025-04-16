import { useState, useEffect } from 'react';
// Import ParticipantDetails from firebase
import { findUsersByUsername, getCurrentUser, ParticipantDetails } from '../services/firebase';
import '../styles/Search.css';
import { User } from 'firebase/auth';

// Update interface to match Firebase data structure
interface UserSearchResult {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string | null; // <<< Allow null from firebase search results
}

interface SearchProps {
  currentUser: User | null;
  onUserSelected: (user: ParticipantDetails) => void; // Uses imported type
}

const Search = ({ currentUser, onUserSelected }: SearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);

    const handler = setTimeout(async () => {
      try {
        const users = await findUsersByUsername(searchQuery);
        setSearchResults(users);
      } catch (error: any) {
        console.error("Error searching users:", error);
        setSearchError(error.message || "Failed to fetch users.");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, currentUser]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted, search triggered by query change.");
  };

  const handleAddUser = (user: UserSearchResult) => {
    if (!currentUser) return;

    const participantDetails: ParticipantDetails = {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL || null // <<< Ensure null is passed if photoURL is missing/empty
    };

    console.log(`User selected: ${user.displayName} (${user.uid})`);
    onUserSelected(participantDetails);
  };

  return (
    <div className="search-screen">
      {/* Add Screen Title */}
      <h2 className="screen-title">Discover</h2>

      {/* Move Search Form Here */}
      <div className="search-form-container">
        <form onSubmit={handleSearchSubmit}>
          <div className="global-search-box">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search by username..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                type="button" 
                className="clear-search" 
                onClick={() => setSearchQuery('')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="search-content">
        {isSearching ? (
          <div className="search-loading">
            <div className="search-spinner"></div>
            <p>Searching...</p>
          </div>
        ) : searchError ? (
          <div className="search-placeholder"> 
             <p className="placeholder-text" style={{ color: '#ff5555' }}>{searchError}</p>
          </div>
        ) : !hasSearched ? (
          <div className="search-placeholder">
            <div className="search-illustration">
              <img src="/src/assets/searching.png" alt="Searching illustration" />
            </div>
            <p className="placeholder-text">Search for people by their username</p>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="search-results">
            <h3 className="results-heading">People</h3>
            <div className="user-results">
              {searchResults.map(user => (
                <div key={user.uid} className="user-result-item">
                  <div className="user-avatar">
                    <img 
                      src={user.photoURL || '/src/assets/default-avatar.png'} 
                      alt={user.displayName} 
                    />
                  </div>
                  <div className="user-info">
                    <h4 className="user-name">{user.displayName}</h4>
                    <p className="user-username">@{user.username}</p>
                  </div>
                  <button 
                    className="add-user-btn" 
                    onClick={() => handleAddUser(user)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                      <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
           <div className="search-placeholder">
             <p className="placeholder-text">No users found matching "{searchQuery}"</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default Search;
