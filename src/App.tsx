import { useState, useEffect } from 'react';
import Welcome from './screens/Welcome';
import Chatlist from './screens/Chatlist';
import Search from './screens/Search';
import Profile from './screens/Profile';
import KYC from './screens/KYC';
import Header from './components/Header';
import Footer, { TabType } from './components/Footer';
import { getCurrentUser, isUserProfileComplete, observeAuthState } from './services/firebase';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [needsKYC, setNeedsKYC] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  // Check user auth state and KYC status on load
  useEffect(() => {
    setIsLoading(true);
    
    // This will listen for auth state changes
    const unsubscribe = observeAuthState(async (user) => {
      if (user) {
        console.log("User signed in:", user.uid);
        
        try {
          // Check if user has completed KYC
          const profileComplete = await isUserProfileComplete(user.uid);
          console.log("Profile complete:", profileComplete);
          
          // Set both states together after we have the profile status
          setCurrentUser(user);
          setNeedsKYC(!profileComplete);
          setIsLoggedIn(true);
        } catch (error) {
          console.error("Error checking profile status:", error);
          setCurrentUser(user);
          setNeedsKYC(true);
          setIsLoggedIn(true);
        }
      } else {
        console.log("No user signed in");
        setIsLoggedIn(false);
        setCurrentUser(null);
        setNeedsKYC(false);
      }
      
      setIsLoading(false);
    });
    
    // Cleanup the subscription on unmount
    return () => unsubscribe();
  }, []);

  // Handle manual login (only used for testing/demo purposes)
  const handleLogin = (user) => {
    if (!user) {
      user = getCurrentUser();
    }
    
    setIsLoggedIn(true);
    setCurrentUser(user);
    
    // Don't assume KYC is needed for login - check if they already have a profile
    isUserProfileComplete(user.uid).then(complete => {
      setNeedsKYC(!complete);
    });
  };
  
  // Handle KYC completion
  const handleKYCComplete = () => {
    setNeedsKYC(false);
  };

  // Handler for changing tabs
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  // Render different content based on the active tab
  const renderContent = () => {
    if (needsKYC && currentUser) {
      return <KYC user={currentUser} onComplete={handleKYCComplete} />;
    }
    
    switch (activeTab) {
      case 'chats':
        return <Chatlist />;
      case 'search':
        return <Search />;
      case 'profile':
        return <Profile />;
      default:
        return <Chatlist />;
    }
  };

  // Modify getHeaderTitle to return null for chats tab
  const getHeaderTitle = () => {
    if (needsKYC) {
      return 'Complete Profile';
    }
    
    switch (activeTab) {
      case 'chats':
        return null; // Indicate logo should be shown instead of title
      case 'search':
        return 'Discover';
      case 'profile':
        return 'Profile';
      default:
        return null; // Default to logo for safety
    }
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const headerTitle = getHeaderTitle();
  const showLogoInHeader = activeTab === 'chats' && !needsKYC;

  return (
    <div className="app">
      {!isLoggedIn ? (
        <Welcome onLogin={handleLogin} />
      ) : (
        <>
          {/* Pass showLogo prop to Header */}
          {!needsKYC && <Header title={headerTitle ?? undefined} showLogo={showLogoInHeader} />}
          <div className={needsKYC ? "main-content no-header" : "main-content"}>
            {renderContent()}
          </div>
          {!needsKYC && <Footer activeTab={activeTab} onTabChange={handleTabChange} />}
        </>
      )}
    </div>
  );
}

export default App;
