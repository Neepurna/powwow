import React, { useState, useEffect } from 'react';
import '../styles/Header.css';
import logoImage from '../assets/logo.png';

interface HeaderProps {
  title?: string | null;
  showBackButton?: boolean;
  onBack?: () => void;
  showLogo?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, showBackButton = false, onBack, showLogo = false }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const appElement = document.querySelector('.app');
      if (appElement && appElement.scrollTop > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    const appElement = document.querySelector('.app');
    if (appElement) {
      appElement.addEventListener('scroll', handleScroll);
      return () => appElement.removeEventListener('scroll', handleScroll);
    }
    
    return undefined;
  }, []);

  return (
    <header className={`app-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-content">
        {/* Render Back Button OR a placeholder if not shown */}
        {showBackButton ? (
          <button onClick={onBack} className="back-button" aria-label="Go back">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
        ) : (
          <div className="button-placeholder"></div> /* Placeholder on the left */
        )}

        {/* Title/Logo Container */}
        <div className="header-title-container">
          {title ? (
            <h1 className="header-title">{title}</h1>
          ) : (
            <img src={logoImage} alt="PowWow Logo" className="header-logo" />
          )}
        </div>

        {/* Always render a placeholder on the right for balance */}
        <div className="button-placeholder"></div> 
      </div>
    </header>
  );
};

export default Header;
