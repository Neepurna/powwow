import { useState, useEffect } from 'react';
import { User, getAuth, getRedirectResult } from 'firebase/auth';
import { signInWithGoogle } from '../services/firebase';
import '../styles/SignIn.css';

interface SignInProps {
  onLoginSuccess: (user: User) => void;
  onLoginError?: (error: Error) => void;
}

const SignIn = ({ onLoginSuccess, onLoginError }: SignInProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add an effect to check for redirect result when the component mounts
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        setIsLoading(true);
        const auth = getAuth();
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log('User signed in after redirect:', result.user.displayName || result.user.email);
          if (onLoginSuccess) {
            onLoginSuccess(result.user);
          }
        }
      } catch (error) {
        console.error('Redirect sign-in error:', error);
        setErrorMsg("Authentication failed. Please try again.");
        if (onLoginError && error instanceof Error) {
          onLoginError(error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkRedirectResult();
  }, [onLoginSuccess, onLoginError]);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user && onLoginSuccess) {
        onLoginSuccess(user);
      }
      // If no user is returned, it means we're being redirected
      // The redirect result will be handled by the useEffect
    } catch (error) {
      console.error('Google sign in error:', error);
      setErrorMsg("Authentication failed. Please try again.");
      if (onLoginError && error instanceof Error) {
        onLoginError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <button 
        className="google-signin-btn"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        {isLoading ? (
          'Signing in...'
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 0, 0)">
                <path d="M21.35,11.1H12v3.2h5.59c-0.51,2.83-2.94,4.5-5.59,4.5c-3.35,0-6.07-2.71-6.07-6.05 s2.72-6.05,6.07-6.05c1.4,0,2.68,0.47,3.69,1.28l2.34-2.34C16.27,4.22,14.23,3.5,12,3.5c-4.97,0-9,4.03-9,9s4.03,9,9,9 c4.5,0,8.55-3.01,8.55-9C20.55,11.94,21.05,11.1,21.35,11.1z" fill="#121212"/>
              </g>
            </svg>
            Sign in with Google
          </>
        )}
      </button>
      
      {errorMsg && (
        <div className="login-error-message">
          {errorMsg}
        </div>
      )}
    </div>
  );
};

export default SignIn;
