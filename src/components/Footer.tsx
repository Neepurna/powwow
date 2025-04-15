import { useState } from 'react';
import '../styles/Footer.css';

export type TabType = 'chats' | 'search' | 'profile';

interface FooterProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const Footer = ({ activeTab, onTabChange }: FooterProps) => {
  const handleTabClick = (tab: TabType) => {
    onTabChange(tab);
  };

  return (
    <footer className="app-footer">
      <div className="footer-tabs">
        <button 
          className={`footer-tab ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => handleTabClick('chats')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
          <span className="tab-label">Chats</span>
        </button>
        
        <button 
          className={`footer-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => handleTabClick('search')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <span className="tab-label">Search</span>
        </button>
        
        <button 
          className={`footer-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleTabClick('profile')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <span className="tab-label">Profile</span>
        </button>
      </div>
    </footer>
  );
};

export default Footer;
