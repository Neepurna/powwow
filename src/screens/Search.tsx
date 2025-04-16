import { useState, useEffect } from 'react';
// Import createChat and getCurrentUser - createChat is no longer needed here
import { findUsersByUsername, getCurrentUser } from '../services/firebase'; 
import '../styles/Search.css';
import { User } from 'firebase/auth'; // Import User type

// Define ParticipantDetails directly or import if moved
interface ParticipantDetails {
  uid: string;
  displayName: string;
  photoURL: string;
}

// Update interface to match Firebase data structure
interface UserSearchResult {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
}

interface SearchProps {
  currentUser: User | null; 
  // Replace onChatCreated with onUserSelected
  onUserSelected: (user: ParticipantDetails) => void; 
}

const Search = ({ currentUser, onUserSelected }: SearchProps) => { // Destructure props
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false); 
  // Remove addingUserId state
  // const [addingUserId, setAddingUserId] = useState<string | null>(null); 

  // Debounce search
  useEffect(() => {
    if (!currentUser) return; // Don't search if no user

    // Clear previous results and error when query is empty
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      setHasSearched(false); // Reset search status
      return;
    }

    // Set searching state immediately for responsiveness
    setIsSearching(true);
    setSearchError(null); // Clear previous errors
    setHasSearched(true); // Mark that a search is initiated

    const handler = setTimeout(async () => {
      try {
        // Pass currentUser.uid to exclude self from results in firebase function
        const users = await findUsersByUsername(searchQuery); 
        setSearchResults(users);
      } catch (error: any) {
        console.error("Error searching users:", error);
        setSearchError(error.message || "Failed to fetch users.");
        setSearchResults([]); // Clear results on error
      } finally {
        setIsSearching(false);
      }
    }, 500); // Debounce time: 500ms

    // Cleanup function to clear timeout if query changes before timeout finishes
    return () => {
      clearTimeout(handler);
    };
  // Add currentUser to dependency array
  }, [searchQuery, currentUser]); // Re-run effect when searchQuery changes

  // Form submission handler (optional, as search happens on query change)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // The search is already triggered by the useEffect hook
    // You could potentially force a search here if needed, but it might be redundant
    console.log("Form submitted, search triggered by query change.");
  };

  // Function to handle adding a user - Now just calls onUserSelected
  const handleAddUser = (user: UserSearchResult) => {
    if (!currentUser) return; 

    // Convert UserSearchResult to ParticipantDetails
    const participantDetails: ParticipantDetails = {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL || '/src/assets/default-avatar.png' // Ensure fallback
    };
    
    console.log(`User selected: ${user.displayName} (${user.uid})`);
    onUserSelected(participantDetails); // Call the callback passed from App.tsx
  };

  return (
    <div className="search-screen">
      <div className="search-header">
        {/* Use handleSearchSubmit for form submission */}
        <form onSubmit={handleSearchSubmit}>
          <div className="global-search-box">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search by username..." // Updated placeholder
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
          // Display error message
          <div className="search-placeholder"> 
             <p className="placeholder-text" style={{ color: '#ff5555' }}>{searchError}</p>
          </div>
        ) : !hasSearched ? (
          // Initial placeholder before any search
          <div className="search-placeholder">
            <div className="search-illustration">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64">
                <path fill="rgba(255,255,255,0.2)" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </div>
            <p className="placeholder-text">Search for people by their username</p>
          </div>
        ) : searchResults.length > 0 ? (
          // Display results
          <div className="search-results">
            <h3 className="results-heading">People</h3>
            <div className="user-results">
              {/* Map over actual searchResults */}
              {searchResults.map(user => (
                <div key={user.uid} className="user-result-item">
                  <div className="user-avatar">
                    {/* Use photoURL from Firebase, provide a fallback */}
                    <img 
                      src={user.photoURL || '/src/assets/default-avatar.png'} // Add a default avatar image
                      alt={user.displayName} 
                    />
                  </div>
                  <div className="user-info">
                    {/* Use displayName and username from Firebase */}
                    <h4 className="user-name">{user.displayName}</h4>
                    <p className="user-username">@{user.username}</p>
                  </div>
                  {/* Update onClick handler */}
                  <button 
                    className="add-user-btn" 
                    onClick={() => handleAddUser(user)}
                    // Remove disabled logic related to addingUserId
                  >
                    {/* Keep the plus icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                      <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
           // Display "No results" message after a search yielded nothing
           <div className="search-placeholder">
             <p className="placeholder-text">No users found matching "{searchQuery}"</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default Search;
