import { useState, useEffect } from 'react';
import Welcome from './screens/Welcome';
import Chatlist from './screens/Chatlist';
import Search from './screens/Search';
import Profile from './screens/Profile';
import KYC from './screens/KYC';
import ChatSystem from './screens/ChatSystem'; 
import Header from './components/Header';
import Footer, { TabType } from './components/Footer';
import { User } from 'firebase/auth'; 
// Import createChat for use in Chatlist click handler via App
import { getCurrentUser, isUserProfileComplete, observeAuthState, createChat, getPendingChats, updatePendingChats } from './services/firebase'; 
import './App.css';

// Define ParticipantDetails interface (can be moved to a types file later)
interface ParticipantDetails {
  uid: string;
  displayName: string;
  photoURL: string;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [needsKYC, setNeedsKYC] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const [activeChatId, setActiveChatId] = useState<string | null>(null); 
  const [activeChatPartner, setActiveChatPartner] = useState<ParticipantDetails | null>(null); 
  // State to hold users selected from search
  const [usersToAdd, setUsersToAdd] = useState<ParticipantDetails[]>([]); 

  // Check user auth state and KYC status on load
  useEffect(() => {
    setIsLoading(true);
    
    // This will listen for auth state changes
    const unsubscribe = observeAuthState(async (user) => {
      if (user) {
        console.log("User signed in:", user.uid);
        setCurrentUser(user); // Set user immediately
        setIsLoggedIn(true); // Set logged in status

        try {
          // Fetch profile completion status and pending chats concurrently
          const [profileComplete, pendingChats] = await Promise.all([
            isUserProfileComplete(user.uid),
            getPendingChats(user.uid) // Fetch pending chats
          ]);
          
          console.log("Profile complete:", profileComplete);
          console.log("Fetched pending chats:", pendingChats.length);

          setNeedsKYC(!profileComplete);
          setUsersToAdd(pendingChats); // Initialize usersToAdd state

        } catch (error) {
          console.error("Error fetching initial user data:", error);
          // Handle potential errors, maybe default states
          setNeedsKYC(true); // Assume KYC needed if check fails
          setUsersToAdd([]); // Default to empty pending list
        } finally {
           setIsLoading(false); // Set loading false after all checks/fetches
        }
      } else {
        console.log("No user signed in");
        // Clear all user-specific state on logout
        setIsLoggedIn(false);
        setCurrentUser(null);
        setNeedsKYC(false);
        setUsersToAdd([]); // Clear pending users
        setActiveChatId(null);
        setActiveChatPartner(null);
        setActiveTab('chats'); // Reset to default tab
        setIsLoading(false); // Set loading false
      }
      
      // Removed setIsLoading(false) from here, moved to finally block above
    });
    
    // Cleanup the subscription on unmount
    return () => unsubscribe();
  }, []);

  // Handle manual login (only used for testing/demo purposes)
  const handleLogin = (user: User | null) => { // Allow null user
    if (!user) {
      // This case might not be needed if observeAuthState handles null correctly
      setIsLoggedIn(false);
      setCurrentUser(null);
      setNeedsKYC(false);
      setActiveChatId(null); // Clear active chat on logout
      setActiveChatPartner(null);
      return;
    }
    
    setIsLoggedIn(true);
    setCurrentUser(user);
    
    // Check KYC status
    isUserProfileComplete(user.uid).then(complete => {
      setNeedsKYC(!complete);
      if (!complete) {
        setActiveTab('chats'); // Default to chats, KYC screen will overlay
        setActiveChatId(null); // Ensure no chat is active during KYC
        setActiveChatPartner(null);
      }
    });
  };
  
  // Handle KYC completion
  const handleKYCComplete = () => {
    setNeedsKYC(false);
    setActiveTab('chats'); // Ensure user is on chats tab after KYC
  };

  // Handler for changing tabs
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setActiveChatId(null); // Close active chat when changing main tabs
    setActiveChatPartner(null);
  };

  // Handler for selecting a user from search results
  const handleUserSelected = async (user: ParticipantDetails) => {
    if (!currentUser) return;

    // Update local state first for immediate UI feedback
    let updatedUsers: ParticipantDetails[] = [];
    setUsersToAdd(prevUsers => {
      // Avoid adding duplicates
      if (prevUsers.some(u => u.uid === user.uid)) {
        updatedUsers = prevUsers; // No change
        return prevUsers;
      }
      updatedUsers = [...prevUsers, user]; // Store the new array
      return updatedUsers;
    });

    // Update Firestore if the list actually changed
    if (updatedUsers.length > usersToAdd.length) { // Check if a user was actually added
       try {
         await updatePendingChats(currentUser.uid, updatedUsers);
         console.log("Pending chats updated in Firestore after adding user.");
       } catch (error) {
         console.error("Failed to update pending chats in Firestore:", error);
         // Optionally revert local state or show an error message
       }
    }

    // Navigate after state updates
    setActiveTab('chats'); 
    setActiveChatId(null); 
    setActiveChatPartner(null);
  };

  // Function to remove a user from the 'usersToAdd' list (e.g., after chat is created)
  const removeUserToAdd = async (userId: string) => {
     if (!currentUser) return;

     // Update local state
     let updatedUsers: ParticipantDetails[] = [];
     setUsersToAdd(prevUsers => {
        updatedUsers = prevUsers.filter(u => u.uid !== userId);
        return updatedUsers;
     });

     // Update Firestore
     try {
       await updatePendingChats(currentUser.uid, updatedUsers);
       console.log("Pending chats updated in Firestore after removing user.");
     } catch (error) {
       console.error("Failed to update pending chats in Firestore:", error);
       // Optionally revert local state or show an error message
     }
  };

  // Handler for selecting an existing chat or initiating a new one from Chatlist
  const handleNavigateToChat = async (partnerDetails: ParticipantDetails, existingChatId?: string) => {
    if (!currentUser) return;

    let chatIdToUse = existingChatId;
    let userWasPending = usersToAdd.some(u => u.uid === partnerDetails.uid); // Check if the user was in the pending list

    // If no existingChatId is provided, it means we need to create/find the chat
    if (!chatIdToUse) {
      try {
        console.log(`Attempting to create/find chat for user: ${partnerDetails.displayName}`);
        // Attempt to create the chat (will return existing ID if found)
        const newChatId = await createChat(currentUser.uid, partnerDetails.uid);
        if (newChatId) {
          chatIdToUse = newChatId;
          // If the user was pending, remove them from the list now that chat exists
          if (userWasPending) {
             await removeUserToAdd(partnerDetails.uid); // Call the async version
          }
        } else {
          console.error("Failed to create or find chat ID.");
          // Handle error appropriately (e.g., show a message to the user)
          return; // Stop navigation if chat creation fails
        }
      } catch (error) {
        console.error("Error during chat creation/navigation:", error);
        // Handle error (e.g., show a message)
        return; // Stop navigation on error
      }
    }
    
    // Proceed with navigation if we have a chatId
    if (chatIdToUse) {
      console.log("Navigating to chat:", chatIdToUse, "with", partnerDetails.displayName);
      setActiveChatId(chatIdToUse);
      setActiveChatPartner(partnerDetails);
      // Optionally set activeTab to 'chats' if needed, though header/footer hide anyway
    }
  };

  // Handler for going back from chat
  const handleBackFromChat = () => {
    setActiveChatId(null);
    setActiveChatPartner(null);
    setActiveTab('chats'); // Explicitly return to chats tab
  };

  // Render different content based on the active tab or active chat
  const renderContent = () => {
    // KYC takes precedence
    if (needsKYC && currentUser) {
      return <KYC user={currentUser} onComplete={handleKYCComplete} />;
    }

    // Active chat takes precedence over tabs
    if (activeChatId && currentUser && activeChatPartner) {
      return <ChatSystem 
               chatId={activeChatId} 
               currentUser={currentUser} 
               otherParticipant={activeChatPartner}
               onBack={handleBackFromChat} 
             />;
    }
    
    // Render tab content if no active chat
    switch (activeTab) {
      case 'chats':
        return <Chatlist 
                  currentUser={currentUser} 
                  onNavigateToSearch={() => handleTabChange('search')} 
                  onChatSelect={handleNavigateToChat} // Pass updated handler
                  addedUsers={usersToAdd} // Pass users to add
                  onRemoveUserToAdd={removeUserToAdd} // Pass remove function
               />; 
      case 'search':
        return <Search 
                  currentUser={currentUser} 
                  onUserSelected={handleUserSelected} // Pass user selection handler
               />;
      case 'profile':
        return <Profile />; 
      default:
        return <Chatlist 
                  currentUser={currentUser} 
                  onNavigateToSearch={() => handleTabChange('search')} 
                  onChatSelect={handleNavigateToChat} // Pass updated handler
                  addedUsers={usersToAdd} // Pass users to add
                  onRemoveUserToAdd={removeUserToAdd} // Pass remove function
               />; 
    }
  };

  // Modify getHeaderTitle based on active chat
  const getHeaderTitle = (): string | null | undefined => {
    if (needsKYC) {
      return 'Complete Profile';
    }
    if (activeChatId && activeChatPartner) {
      return activeChatPartner.displayName; // Show partner's name in header
    }
    
    switch (activeTab) {
      case 'chats':
        return null; // Show logo
      case 'search':
        return 'Discover';
      case 'profile':
        return 'Profile';
      default:
        return null; // Default to logo
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
  // Show logo only on chats tab AND when no chat is active
  const showLogoInHeader = activeTab === 'chats' && !activeChatId && !needsKYC; 
  // Show back button only when a chat is active
  const showBackButtonInHeader = !!activeChatId && !needsKYC;

  return (
    <div className="app">
      {!isLoggedIn ? (
        <Welcome onLogin={() => { /* observeAuthState handles login logic now */ }} />
      ) : (
        <>
          {/* Conditionally render Header based on KYC and active chat */}
          {!needsKYC && (
            <Header 
              title={headerTitle ?? undefined} 
              showLogo={showLogoInHeader} 
              showBackButton={showBackButtonInHeader}
              onBackClick={handleBackFromChat} // Pass back handler
            />
          )}
          {/* Adjust main content padding based on whether header/footer are visible */}
          <div className={(needsKYC || activeChatId) ? "main-content no-header" : "main-content"}>
            {renderContent()}
          </div>
          {/* Conditionally render Footer based on KYC and active chat */}
          {!needsKYC && !activeChatId && (
            <Footer activeTab={activeTab} onTabChange={handleTabChange} />
          )}
        </>
      )}
    </div>
  );
}

export default App;
