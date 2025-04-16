import { useState } from 'react';
import { signOut } from '../services/firebase';
import '../styles/Profile.css';

const Profile = () => {
  // Mock user data - would come from authentication/database in a real app
  const [user] = useState({
    name: 'Alex Morgan',
    username: '@alexm',
    bio: 'Software developer | Hackathon enthusiast | Coffee lover',
    avatar: 'https://i.pravatar.cc/300?img=8',
    stats: {
      friends: 128,
      groups: 15,
      messages: 1432
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  
  const handleLogout = async () => {
    await signOut();
    // Refresh the page or redirect to login
    window.location.reload();
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-cover">
          <div className="cover-gradient"></div>
        </div>
        <div className="profile-avatar-container">
          <div className="profile-avatar">
            <img src={user.avatar} alt={user.name} />
          </div>
          <button className="edit-avatar-button">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="profile-info">
        <div className="profile-name-section">
          <h1 className="profile-name">{user.name}</h1>
          <p className="profile-username">{user.username}</p>
        </div>
        
        <button className="edit-profile-button" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Save Profile' : 'Edit Profile'}
        </button>
        
        <div className="profile-bio">
          {isEditing ? (
            <textarea 
              className="bio-editor" 
              defaultValue={user.bio}
              maxLength={160}
              placeholder="Tell us about yourself"
            ></textarea>
          ) : (
            <p>{user.bio}</p>
          )}
        </div>
        
        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-value">{user.stats.friends}</span>
            <span className="stat-label">Friends</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{user.stats.groups}</span>
            <span className="stat-label">Groups</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{user.stats.messages}</span>
            <span className="stat-label">Messages</span>
          </div>
        </div>
      </div>

      <div className="profile-sections">
        <button className="logout-button" onClick={handleLogout}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;
