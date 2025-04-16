import { useState } from 'react';
import { User } from 'firebase/auth';
import SignIn from '../components/SignIn';
import '../styles/Welcome.css';

interface WelcomeProps {
  onLogin?: () => void;
}

const Welcome = ({ onLogin }: WelcomeProps) => {
  const [error, setError] = useState<string | null>(null);

  const handleLoginSuccess = (user: User) => {
    console.log('User signed in:', user.displayName);
    // You can store user data in context or state management if needed
    if (onLogin) {
      onLogin();
    }
  };

  const handleLoginError = (error: Error) => {
    setError('Login failed. Please try again.');
    console.error('Login error:', error.message);
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
