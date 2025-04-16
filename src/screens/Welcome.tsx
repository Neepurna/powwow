import { useState } from 'react';
import { User } from 'firebase/auth';
import SignIn from '../components/SignIn';
import '../styles/Welcome.css';
// Import the logo image
import logoImage from '../assets/logo.png';

interface WelcomeProps {
  onLogin: (user: User) => void;
}

const Welcome = ({ onLogin }: WelcomeProps) => {
  const [error, setError] = useState<string | null>(null);

  const handleLoginSuccess = (user: User) => {
    console.log('User signed in:', user.displayName || user.email);
    // Pass the user object to the parent component
    onLogin(user);
  };

  const handleLoginError = (error: Error) => {
    setError('Login failed. Please try again later.');
    console.error('Login error:', error.message);
  };

  return (
    <div className="welcome-container">
      <div className="welcome-content">
        {/* Replace h1 with img */}
        <img src={logoImage} alt="PowWow Logo" className="app-logo" /> 
        
        <div className="welcome-image-container">
          <img 
            src="/src/assets/welcome.png" 
            alt="PowWow Welcome" 
            className="welcome-image" 
          />
        </div>
        
        <p className="welcome-text">
          Link Up. Speak Out. Stay Lit!
        </p>

        <SignIn 
          onLoginSuccess={handleLoginSuccess} 
          onLoginError={handleLoginError}
        />
        
        {error && <p className="login-error">{error}</p>}
        
        <p className="welcome-footer">
          Simple. Secure. Reliable messaging.
        </p>
      </div>
    </div>
  );
};

export default Welcome;
