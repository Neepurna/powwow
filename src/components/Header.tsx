import { useState, useEffect } from 'react';
import '../styles/Header.css';
// Import the logo image
import logoImage from '../assets/logo.png';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  showLogo?: boolean; // Add showLogo prop
}

const Header = ({ title = 'PowWow!', showBackButton = false, onBackClick, showLogo = false }: HeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Get the app container element instead of using window
      const appElement = document.querySelector('.app');
      if (appElement && appElement.scrollTop > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    // Attach scroll event to the app container instead of window
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
        {showBackButton && (
          <button className="back-button" onClick={onBackClick}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
        )}
        {/* Conditionally render logo or title */}
        {showLogo ? (
          <img src={logoImage} alt="PowWow Logo" className="header-logo" />
        ) : (
          <h1 className="header-title">{title}</h1>
        )}
      </div>
    </header>
  );
};

export default Header;
