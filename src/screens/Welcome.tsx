import { useState } from 'react';
import '../styles/Welcome.css';

const Welcome = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    // Here you would implement actual Google Sign-In logic
    // For now, just simulate loading state
    setTimeout(() => {
      setIsLoading(false);
      alert('Google Sign-In would happen here');
    }, 1500);
  };

  return (
    <div className="welcome-container">
      <div className="welcome-content">
        <h1 className="app-title">PowWow!</h1>
        
        <div className="welcome-image-container">
          <img 
            src="/src/assets/welcome.png" 
            alt="PowWow Welcome" 
            className="welcome-image" 
          />
        </div>
        
        <p className="welcome-text">
        Link Up. Speak Out. Stay Lit!        </p>

        <button 
          className="google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </button>
        
        <p className="welcome-footer">
          Simple. Secure. Reliable messaging.
        </p>
      </div>
    </div>
  );
};

export default Welcome;
