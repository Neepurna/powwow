import { useState } from 'react';
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
        <div className="profile-section">
          <h3 className="section-title">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
            Notifications
          </h3>
          <div className="section-content">
            <div className="toggle-row">
              <span>Message Notifications</span>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="toggle-row">
              <span>Group Notifications</span>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3 className="section-title">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
            </svg>
            Privacy & Security
          </h3>
          <div className="section-content">
            <div className="toggle-row">
              <span>Show Online Status</span>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="toggle-row">
              <span>Read Receipts</span>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <button className="logout-button">
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
