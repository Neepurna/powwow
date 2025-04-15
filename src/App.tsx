import { useState } from 'react';
import Welcome from './screens/Welcome';
import Chatlist from './screens/Chatlist';
import Search from './screens/Search';
import Profile from './screens/Profile';
import Header from './components/Header';
import Footer, { TabType } from './components/Footer';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('chats');

  // For demo purposes - in a real app this would check auth status
  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  // Handler for changing tabs
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  // Render different content based on the active tab
  const renderContent = () => {
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

  // Get the header title based on active tab
  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'chats':
        return 'PowWow!';
      case 'search':
        return 'Discover';
      case 'profile':
        return 'Profile';
      default:
        return 'PowWow!';
    }
  };

  return (
    <div className="app">
      {!isLoggedIn ? (
        <Welcome onLogin={handleLogin} />
      ) : (
        <>
          <Header title={getHeaderTitle()} />
          <div className="main-content">
            {renderContent()}
          </div>
          <Footer activeTab={activeTab} onTabChange={handleTabChange} />
        </>
      )}
    </div>
  );
}

export default App;
