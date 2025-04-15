import { useState, useEffect } from 'react';
import '../styles/Header.css';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

const Header = ({ title = 'PowWow!', showBackButton = false, onBackClick }: HeaderProps) => {
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
        <h1 className="header-title">{title}</h1>
        <div className="header-actions">
          <button className="header-action-button">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
