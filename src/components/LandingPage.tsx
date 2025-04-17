import React from 'react';
import '../styles/LandingPage.css';
import logoImage from '../assets/logo.png';

// SVG icons
const checkIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
  <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
</svg>`;

const lockIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
  <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
</svg>`;

const groupIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
  <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
</svg>`;

const imageIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
  <path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
</svg>`;

interface LandingPageProps {
  children: React.ReactNode;
}

const LandingPage: React.FC<LandingPageProps> = ({ children }) => {
  return (
    <div className="landing-container">
      {/* Welcome Panel */}
      <div className="welcome-panel">
        <img src={logoImage} alt="Powwow Logo" className="welcome-logo" />
        
        <h2 className="welcome-subtitle">Link Up. Speak Out. Stay Lit!</h2>
        <p className="welcome-description">
          Powwow is a modern messaging platform that brings people together in a simple, 
          secure, and fun environment. Connect with friends, create groups, and share moments 
          that matter.
        </p>
        
        <ul className="features-list">
          <li className="feature-item">
            <div className="feature-icon" dangerouslySetInnerHTML={{ __html: checkIconSvg }} />
            <span className="feature-text">Instant messaging with real-time updates</span>
          </li>
          <li className="feature-item">
            <div className="feature-icon" dangerouslySetInnerHTML={{ __html: lockIconSvg }} />
            <span className="feature-text">Secure, end-to-end communication</span>
          </li>
          <li className="feature-item">
            <div className="feature-icon" dangerouslySetInnerHTML={{ __html: groupIconSvg }} />
            <span className="feature-text">Create group chats with friends</span>
          </li>
          <li className="feature-item">
            <div className="feature-icon" dangerouslySetInnerHTML={{ __html: imageIconSvg }} />
            <span className="feature-text">Share images and memories instantly</span>
          </li>
        </ul>
        
        <p className="welcome-cta">Try the app demo on the right →</p>
      </div>
      
      {/* App Panel - Mobile Frame - Static positioning without notch */}
      <div className="app-panel">
        <div className="mobile-frame">
          <div className="app-content-wrapper">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
