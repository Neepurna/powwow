import { useState, useRef, useEffect } from 'react'; 
// Import createChat from firebase services
import { db, getCurrentUser, createChat } from '../services/firebase'; 
// Import necessary firestore functions
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore'; 
import { User } from 'firebase/auth'; 
import '../styles/Chatlist.css';
import plusIcon from '../assets/icons/Plus.svg';
import NoUsers from '../components/NoUsers'; 
// Import close icon or use text 'X'
// import closeIcon from '../assets/icons/Close.svg'; 

// Define ParticipantDetails interface (can be moved to a types file later)
interface ParticipantDetails {
  uid: string;
  displayName: string;
  photoURL: string;
}

// Add a flag to distinguish newly added items
interface ChatItem {
  id: string; 
  participantIds: string[];
  lastMessage: string | null;
  lastMessageTimestamp: Timestamp | null;
  otherParticipant?: ParticipantDetails; 
  isNewlyAdded?: boolean; // Flag for users from addedUsers prop
}

interface ChatlistProps {
  currentUser: User | null; 
  onNavigateToSearch: () => void;
  // Update onChatSelect signature to accept optional existingChatId
  onChatSelect: (partnerDetails: ParticipantDetails, existingChatId?: string) => void; 
  addedUsers: ParticipantDetails[]; // Users selected from search
  onRemoveUserToAdd: (userId: string) => void; // Function to remove user from App state
}

const Chatlist = ({ 
  currentUser, 
  onNavigateToSearch, 
  onChatSelect, 
  addedUsers, 
  onRemoveUserToAdd 
}: ChatlistProps) => { 
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null); 
  // State to track loading state for individual items being created
  const [creatingChatId, setCreatingChatId] = useState<string | null>(null); 
  // State to hold fetched details for added users
  const [addedUsersDetails, setAddedUsersDetails] = useState<{ [key: string]: ParticipantDetails }>({});

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch chats in real-time (existing useEffect)
  useEffect(() => {
    // ... existing chat listener logic ...
    // This part remains the same, fetching existing chats and their participant details
    if (!currentUser) {
      setIsLoading(false);
      setChats([]); // Clear chats if user logs out
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log("Setting up chat listener for user:", currentUser.uid);

    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef, 
      where("participantIds", "array-contains", currentUser.uid),
      orderBy("lastMessageTimestamp", "desc") 
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      console.log(`Chat listener received ${querySnapshot.size} chats.`);
      const fetchedChats: ChatItem[] = [];
      
      const chatPromises = querySnapshot.docs.map(async (docSnapshot) => { 
        const chatData = docSnapshot.data() as Omit<ChatItem, 'id' | 'otherParticipant' | 'isNewlyAdded'>;
        const chatId = docSnapshot.id;
        const otherUserId = chatData.participantIds.find(id => id !== currentUser?.uid); 
        let otherParticipantData: ChatItem['otherParticipant'] | undefined = undefined;

        if (otherUserId) {
           try {
              const userDocRef = doc(db, "users", otherUserId);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                 const userData = userDocSnap.data();
                 otherParticipantData = {
                    uid: otherUserId,
                    displayName: userData.displayName || 'Unknown User',
                    photoURL: userData.photoURL || '/src/assets/default-avatar.png' 
                 };
              } else {
                 console.warn(`User profile not found for ID: ${otherUserId}`);
                 otherParticipantData = { uid: otherUserId, displayName: 'User', photoURL: '/src/assets/default-avatar.png' };
              }
           } catch (userFetchError) {
              console.error(`Failed to fetch details for user ${otherUserId}:`, userFetchError);
              otherParticipantData = { uid: otherUserId, displayName: 'User', photoURL: '/src/assets/default-avatar.png' };
           }
        }

        fetchedChats.push({
          id: chatId,
          ...chatData,
          otherParticipant: otherParticipantData,
          isNewlyAdded: false 
        });
      });

      await Promise.all(chatPromises); 
      
      // Sort chats by timestamp (descending, nulls last)
      fetchedChats.sort((a, b) => {
         const timeA = a.lastMessageTimestamp?.toMillis() ?? 0;
         const timeB = b.lastMessageTimestamp?.toMillis() ?? 0;
         return timeB - timeA;
      });

      setChats(fetchedChats);
      setIsLoading(false);
      setError(null); 
    }, (err) => {
      console.error("Error listening to chats:", err);
      setError("Failed to load chats.");
      setIsLoading(false);
      setChats([]); 
    });

    return () => {
      console.log("Cleaning up chat listener.");
      unsubscribe();
    };
  }, [currentUser]); 

  // --- NEW useEffect to fetch details for addedUsers ---
  useEffect(() => {
    if (!addedUsers || addedUsers.length === 0) {
      setAddedUsersDetails({}); // Clear details if no added users
      return;
    }

    const fetchAddedUsersDetails = async () => {
      // Use reduce to build the map and avoid race conditions with setState
      const detailsMap = await addedUsers.reduce(async (mapPromise, user) => {
        const map = await mapPromise;
        // Avoid refetching if details already exist (optional optimization)
        // if (map[user.uid]) return map; 
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            map[user.uid] = {
              uid: user.uid,
              displayName: userData.displayName || user.displayName || 'User',
              photoURL: userData.photoURL || user.photoURL || '/src/assets/default-avatar.png'
            };
          } else {
            console.warn(`User profile not found for added user ID: ${user.uid}`);
            map[user.uid] = { ...user }; // Use prop data as fallback
          }
        } catch (fetchError) {
          console.error(`Failed to fetch details for added user ${user.uid}:`, fetchError);
          map[user.uid] = { ...user }; // Use prop data on error
        }
        return map;
      }, Promise.resolve<{ [key: string]: ParticipantDetails }>({})); // Initial value for reduce

      setAddedUsersDetails(detailsMap);
    };

    fetchAddedUsersDetails();

  }, [addedUsers]); // Re-run when addedUsers prop changes

  // Combine Firestore chats and newly added users for display
  const combinedChats = (): ChatItem[] => {
    const existingChatUserIds = new Set(chats.map(chat => chat.otherParticipant?.uid));
    // Filter out users from addedUsers who already have an established chat in the 'chats' state
    const uniqueAddedUsers = addedUsers.filter(user => !existingChatUserIds.has(user.uid));

    // Map uniqueAddedUsers using the fetched details from state if available
    const addedChatItems: ChatItem[] = uniqueAddedUsers.map(user => {
      // Get details from state (fetched), fallback to prop data passed initially
      const details = addedUsersDetails[user.uid] || user; 
      return {
        id: `temp_${user.uid}`, // Temporary ID for key prop
        participantIds: [currentUser?.uid || '', user.uid], // Include current user ID
        lastMessage: "Tap to start chat", // Placeholder message
        lastMessageTimestamp: null,
        // Use the potentially updated details from fetched state
        otherParticipant: {
           uid: details.uid,
           displayName: details.displayName,
           photoURL: details.photoURL
        },
        isNewlyAdded: true // Mark as newly added
      };
    });

    // Place newly added users at the top, followed by existing chats (already sorted)
    return [...addedChatItems, ...chats];
  };

  // Helper to format timestamp
  const formatTimestamp = (timestamp: Timestamp | null): string => {
    // ... existing implementation ...
     if (!timestamp) return '';
     const date = timestamp.toDate();
     return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  // Handle clicking on a chat item
  const handleItemClick = async (item: ChatItem) => {
    // ... existing implementation ...
    if (!currentUser || !item.otherParticipant) {
      console.error("Cannot select chat: Missing current user or participant details.");
      return;
    }

    if (item.isNewlyAdded) {
      setCreatingChatId(item.otherParticipant.uid); 
      setError(null); 
      try {
        // --- Add Logging Here ---
        console.log(`[Chatlist] handleItemClick: Attempting chat creation.`);
        console.log(`[Chatlist] currentUser.uid: ${currentUser.uid}`);
        console.log(`[Chatlist] item.otherParticipant.uid: ${item.otherParticipant.uid}`);
        console.log(`[Chatlist] item.otherParticipant.displayName: ${item.otherParticipant.displayName}`);
        // --- End Logging ---

        console.log(`Attempting to create chat with ${item.otherParticipant.displayName}`);
        const chatId = await createChat(currentUser.uid, item.otherParticipant.uid); 
        
        if (chatId) {
          console.log("Chat created/found successfully:", chatId);
          onChatSelect(item.otherParticipant, chatId); 
          // No need to call onRemoveUserToAdd here, App.tsx handles it in handleNavigateToChat
        } else {
          setError(`Could not start chat with ${item.otherParticipant.displayName}.`);
        }
      } catch (error: any) {
        console.error("Error creating chat on click:", error);
        setError(error.message || `Failed to start chat with ${item.otherParticipant.displayName}.`);
      } finally {
        setCreatingChatId(null); 
      }
    } else {
      // Existing chat from Firestore
      onChatSelect(item.otherParticipant, item.id);
    }
  };

  // Handle clicking the delete button on a newly added item
  const handleDeleteItem = (event: React.MouseEvent, userId: string) => {
    // ... existing implementation ...
    event.stopPropagation(); 
    console.log(`Deleting pending user: ${userId}`);
    onRemoveUserToAdd(userId); 
  };
  
  const displayChats = combinedChats(); // Get the combined list

  return (
    <div className="chatlist-container" ref={containerRef}>
      <div className="search-container">
        {/* ... search box ... */}
        <div className="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input type="text" placeholder="Search conversations" />
        </div>
      </div>

      {/* Conditional Rendering based on loading, error, and combined list */}
      {isLoading && displayChats.length === 0 ? ( // Show loading only if chats haven't loaded yet
        <div className="loading-screen" style={{ height: 'calc(100% - 120px)'}}> 
           <div className="loading-spinner"></div> 
        </div>
      ) : error && displayChats.length === 0 ? ( // Show error only if list is empty
         <div className="search-placeholder" style={{ height: 'calc(100% - 120px)'}}> 
            <p className="placeholder-text" style={{ color: '#ff5555' }}>{error}</p>
         </div>
      ) : displayChats.length === 0 ? (
        <NoUsers onSearchClick={onNavigateToSearch} />
      ) : (
        <div className="chat-list">
          {/* Map over the combined chat data */}
          {displayChats.map((chat) => (
            <div 
              key={chat.id} 
              className={`chat-item ${chat.isNewlyAdded ? 'newly-added' : ''}`} 
              onClick={() => handleItemClick(chat)}
            >
              <div className="chat-avatar">
                {/* Use otherParticipant data which is now potentially updated */}
                <img 
                   src={chat.otherParticipant?.photoURL || '/src/assets/default-avatar.png'} 
                   alt={chat.otherParticipant?.displayName || 'User'} 
                />
              </div>
              <div className="chat-info">
                <div className="chat-header">
                  <h3 className="chat-name">{chat.otherParticipant?.displayName || 'Chat'}</h3>
                  {!chat.isNewlyAdded && (
                    <span className="chat-time">{formatTimestamp(chat.lastMessageTimestamp)}</span>
                  )}
                </div>
                <div className="chat-preview">
                  {creatingChatId === chat.otherParticipant?.uid ? (
                     <p className="chat-message" style={{ fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.5)' }}>Starting chat...</p>
                  ) : (
                     <p className={`chat-message ${chat.isNewlyAdded ? 'placeholder-message' : ''}`}> 
                       {chat.lastMessage || 'No messages yet'}
                     </p>
                  )}
                  {/* <span className="unread-badge">1</span> */}
                </div>
              </div>
              {/* Delete button for newly added items */}
              {chat.isNewlyAdded && chat.otherParticipant && (
                <button 
                  className="delete-pending-btn" 
                  onClick={(e) => handleDeleteItem(e, chat.otherParticipant!.uid)}
                  aria-label={`Remove ${chat.otherParticipant.displayName}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
           {/* Display general error if occurred during chat creation click */}
           {error && !isLoading && <p className="chatlist-error">{error}</p>}
        </div>
      )}

      <button className="new-chat-button" onClick={onNavigateToSearch}> 
        <img src={plusIcon} alt="New Chat" width="24" height="24" />
      </button>
    </div>
  );
};

export default Chatlist;
