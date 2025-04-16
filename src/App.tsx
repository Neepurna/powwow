import { useState, useEffect } from 'react';
import Welcome from './screens/Welcome';
import Chatlist from './screens/Chatlist';
import Search from './screens/Search';
import Profile from './screens/Profile';
import KYC from './screens/KYC';
import ChatSystem from './screens/ChatSystem';
// REMOVE Header import
// import Header from './components/Header';
import Footer, { TabType } from './components/Footer';
import { User } from 'firebase/auth';
// Import necessary functions from firebase service
import {
  getCurrentUser,
  isUserProfileComplete,
  observeAuthState,
  createChat,
  getPendingChats,
  updatePendingChats,
  ParticipantDetails // Import ParticipantDetails if exported from firebase.ts
} from './services/firebase';
import './App.css';

// Define ParticipantDetails interface if not imported
// interface ParticipantDetails {
//   uid: string; // User UID or Group Chat ID
//   displayName: string; // User name or Group name
//   photoURL?: string; // Optional: User photo or Group photo
//   isGroup?: boolean; // Flag for groups
// }

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [needsKYC, setNeedsKYC] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  // State for the active chat
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  // Store details of the chat partner OR the group
  const [activeChatPartner, setActiveChatPartner] = useState<ParticipantDetails | null>(null);
  // State for users selected from search but not yet chatted with
  const [usersToAdd, setUsersToAdd] = useState<ParticipantDetails[]>([]);

  // Authentication state observer
  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      setIsLoading(true); // Start loading on auth state change
      if (user) {
        setCurrentUser(user);
        setIsLoggedIn(true);
        try {
          const profileComplete = await isUserProfileComplete(user.uid);
          if (!profileComplete) {
            setNeedsKYC(true);
          } else {
            setNeedsKYC(false);
            // Fetch pending chats only if KYC is complete
            const pending = await getPendingChats(user.uid);
            setUsersToAdd(pending);
            if (pending.length > 0) {
              // Optionally clear pending chats from DB after loading
              // await updatePendingChats(user.uid, []);
            }
          }
        } catch (error) {
          console.error("Error checking profile completion:", error);
          // Handle error appropriately, maybe show an error message
          setNeedsKYC(false); // Assume profile is complete or let user proceed
        }
      } else {
        setCurrentUser(null);
        setIsLoggedIn(false);
        setNeedsKYC(false);
        setActiveChatId(null); // Clear active chat on logout
        setActiveChatPartner(null);
        setUsersToAdd([]); // Clear pending users on logout
        setActiveTab('chats'); // Reset to default tab
      }
      setIsLoading(false); // End loading after checks
    });

    return () => unsubscribe();
  }, []);

  // --- Persist usersToAdd to Firestore when it changes ---
  useEffect(() => {
    // Only update Firestore if the user is logged in and loading is complete
    // Avoid writing empty array on initial load before pending chats are fetched
    if (currentUser && !isLoading && usersToAdd) { 
      updatePendingChats(currentUser.uid, usersToAdd)
        .catch(error => console.error("Failed to persist usersToAdd:", error));
    }
  // Depend on a stable representation of usersToAdd if possible, or stringify
  }, [usersToAdd, currentUser, isLoading]); 

  // --- Handlers ---

  // Handle successful login from Welcome/SignIn
  const handleLogin = (user: User) => {
    // The observer should handle setting the user state, 
    // but we might manually trigger loading/KYC check here if needed
    // For now, the observer handles it.
    console.log("App: User logged in", user.uid);
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

  // Handler for when a user is selected in Search
  const handleUserSelected = (user: ParticipantDetails) => {
    if (!currentUser) return;

    // Check if user is already in the list or has an existing chat (logic in Chatlist)
    // Add user to the 'usersToAdd' list if not already present
    setUsersToAdd(prevUsers => {
      if (prevUsers.some(u => u.uid === user.uid)) {
        return prevUsers; // Already in the list
      }
      // Add the selected user
      return [...prevUsers, user];
    });

    // Switch back to the chats tab to show the pending user
    setActiveTab('chats');
  };

  // Function to remove a user from the 'usersToAdd' list (e.g., after chat is created or deleted from pending)
  const removeUserToAdd = async (userId: string) => {
     if (!currentUser) return;

     // Update local state immediately for responsiveness
     let updatedUsers: ParticipantDetails[] = [];
     setUsersToAdd(prevUsers => {
        updatedUsers = prevUsers.filter(u => u.uid !== userId);
        // The useEffect for usersToAdd will handle the Firestore update
        return updatedUsers;
     });
     console.log(`User ${userId} removed locally from usersToAdd.`);
     // Firestore update is handled by the useEffect hook watching usersToAdd
  };

  // --- UPDATED: Handler for selecting an existing chat or initiating a new one from Chatlist ---
  const handleNavigateToChat = async (chatDetails: ParticipantDetails, chatId?: string) => {
    if (!currentUser) return;

    let chatIdToUse = chatId;
    let userWasPending = false;

    // If it's NOT a group and no chatId was provided, it's a pending user click
    if (!chatDetails.isGroup && !chatIdToUse) {
      userWasPending = usersToAdd.some(u => u.uid === chatDetails.uid);
      try {
        console.log(`Attempting to create/find chat for user: ${chatDetails.displayName} (UID: ${chatDetails.uid})`); 
        const newChatId = await createChat(currentUser.uid, chatDetails.uid);
        if (newChatId) {
          chatIdToUse = newChatId;
          // If the user was pending, remove them from the list now that chat exists
          if (userWasPending) {
             // Call removeUserToAdd which handles both local state and Firestore update via useEffect
             removeUserToAdd(chatDetails.uid); 
             console.log(`Removed pending user ${chatDetails.uid} after chat creation.`);
          }
        } else {
          console.error("Failed to create or find chat ID.");
          return; // Stop navigation if chat creation fails
        }
      } catch (error) {
        console.error("Error during chat creation/navigation:", error);
        return; // Stop navigation on error
      }
    } else if (chatDetails.isGroup && !chatIdToUse) {
       // This case shouldn't happen if Chatlist passes the ID for existing groups
       console.error("Error: Trying to navigate to a group without a chat ID.");
       return;
    }

    // Proceed with navigation if we have a chatIdToUse
    if (chatIdToUse) {
      console.log(`[App.tsx] Navigating to chat. ID: ${chatIdToUse}, Details:`, JSON.stringify(chatDetails));
      setActiveChatId(chatIdToUse);
      setActiveChatPartner(chatDetails); // Store user OR group details
      // Optionally set activeTab to 'chats' if needed, though header/footer hide anyway
      // setActiveTab('chats'); 
    } else {
       console.error("[App.tsx] Navigation failed: No valid chatId could be determined.");
    }
  };

  // Render different content based on the active tab or active chat
  const renderContent = () => {
    // KYC takes precedence
    if (needsKYC && currentUser) {
      // KYC might need its own container styling if it shouldn't scroll
      return <KYC user={currentUser} onComplete={handleKYCComplete} />;
    }

    // Active chat takes precedence over tabs
    if (activeChatId && currentUser && activeChatPartner) {
      // ChatSystem should fill the .app-content area
      // Pass a function directly for onBack
      return <ChatSystem
               chatId={activeChatId}
               currentUser={currentUser}
               otherParticipant={activeChatPartner}
               onBack={() => {
                 setActiveChatId(null);
                 setActiveChatPartner(null);
                 setActiveTab('chats'); // Go back to chats list
               }}
             />;
    }

    // Render tabs
    switch (activeTab) {
      case 'chats':
        return currentUser ? <Chatlist
                                currentUser={currentUser}
                                onNavigateToSearch={() => setActiveTab('search')}
                                onChatSelect={handleNavigateToChat}
                                addedUsers={usersToAdd}
                                onRemoveUserToAdd={removeUserToAdd}
                              /> : null;
      case 'search':
        // REMOVE the wrapper div
        return currentUser ? <Search
                              currentUser={currentUser}
                              onUserSelected={handleUserSelected}
                            /> : null;
      case 'profile':
        return currentUser ? <Profile
                                user={currentUser}
                              /> : null;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading Powwow...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Welcome onLogin={handleLogin} />;
  }

  return (
    // Change className back to "app"
    <div className="app">
      {/* Content Area */}
      <div className="app-content">
        {renderContent()}
      </div>

      {/* Conditionally render Footer */}
      {isLoggedIn && !needsKYC && !activeChatId && (
        <Footer activeTab={activeTab} onTabChange={handleTabChange} />
      )}
    </div>
  );
}

export default App;
