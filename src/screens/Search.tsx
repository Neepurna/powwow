import { useState } from 'react';
import '../styles/Search.css';

interface UserResult {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Mock search results - would come from an API in a real app
  const [searchResults, setSearchResults] = useState<UserResult[]>([
    {
      id: '1',
      name: 'Emma Wilson',
      username: '@emmaw',
      avatar: 'https://i.pravatar.cc/150?img=5',
    },
    {
      id: '2',
      name: 'Michael Chen',
      username: '@mikechen',
      avatar: 'https://i.pravatar.cc/150?img=12',
    },
    {
      id: '3',
      name: 'Sophia Rodriguez',
      username: '@sophiar',
      avatar: 'https://i.pravatar.cc/150?img=9',
    },
    {
      id: '4',
      name: 'James Taylor',
      username: '@jtaylor',
      avatar: 'https://i.pravatar.cc/150?img=11',
    },
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() === '') return;
    
    setIsSearching(true);
    
    // Simulate API call delay
    setTimeout(() => {
      setIsSearching(false);
      // In a real app, you would filter results based on the query
    }, 800);
  };

  return (
    <div className="search-screen">
      <div className="search-header">
        <form onSubmit={handleSearch}>
          <div className="global-search-box">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search for people, groups, and more..."
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
        ) : searchQuery.trim() === '' ? (
          <div className="search-placeholder">
            <div className="search-illustration">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64">
                <path fill="rgba(255,255,255,0.2)" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </div>
            <p className="placeholder-text">Search for people, groups, or messages</p>
          </div>
        ) : (
          <div className="search-results">
            <h3 className="results-heading">People</h3>
            <div className="user-results">
              {searchResults.map(user => (
                <div key={user.id} className="user-result-item">
                  <div className="user-avatar">
                    <img src={user.avatar} alt={user.name} />
                  </div>
                  <div className="user-info">
                    <h4 className="user-name">{user.name}</h4>
                    <p className="user-username">{user.username}</p>
                  </div>
                  <button className="add-user-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                      <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
