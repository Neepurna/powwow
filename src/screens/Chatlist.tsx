import { useState, useRef, useEffect, useMemo } from 'react';
// Import ParticipantDetails from firebase
import { db, getCurrentUser, createChat, createGroupChat, ParticipantDetails } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import '../styles/Chatlist.css';
import groupIcon from '../assets/icons/Group.svg';
import defaultGroupAvatar from '../assets/icons/GroupAvatar.svg';
import NoUsers from '../components/NoUsers';
import GroupChat from './GroupChat'; // Import the new component

// Update ChatItem to include groupPhotoURL
interface ChatItem {
  id: string;
  participantIds: string[];
  lastMessage: string | null;
  lastMessageTimestamp: Timestamp | null;
  otherParticipant?: ParticipantDetails; // Uses imported type
  isNewlyAdded?: boolean;
  isGroup?: boolean;
  groupName?: string;
  createdBy?: string;
  groupPhotoURL?: string | null; // <<< Add groupPhotoURL
}

interface ChatlistProps {
  currentUser: User | null;
  onNavigateToSearch: () => void;
  onChatSelect: (chatDetails: ParticipantDetails, chatId: string) => void; // Uses imported type
  addedUsers: ParticipantDetails[]; // Uses imported type
  onRemoveUserToAdd: (userId: string) => void;
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
  const [creatingChatId, setCreatingChatId] = useState<string | null>(null);
  const [addedUsersDetails, setAddedUsersDetails] = useState<{ [key: string]: ParticipantDetails }>({});
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch chats in real-time
  useEffect(() => {
    // ... existing setup ...
    if (!currentUser) {
      // ... handle no user ...
      return;
    }
    // ... set loading, clear error ...

    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("participantIds", "array-contains", currentUser.uid),
      orderBy("lastMessageTimestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      console.log(`[Chatlist] Listener triggered: ${querySnapshot.size} chats.`);
      const fetchedChats: ChatItem[] = [];

      const results = await Promise.allSettled(querySnapshot.docs.map(async (docSnapshot) => {
        // <<< Explicitly type chatData to include groupPhotoURL >>>
        const chatData = docSnapshot.data() as Omit<ChatItem, 'id' | 'otherParticipant' | 'isNewlyAdded'> & { groupPhotoURL?: string | null };
        const chatId = docSnapshot.id;

        let chatItem: ChatItem | null = null;

        if (chatData.isGroup) {
          // --- Handle Group Chat ---
          chatItem = {
            id: chatId,
            participantIds: chatData.participantIds,
            lastMessage: chatData.lastMessage,
            lastMessageTimestamp: chatData.lastMessageTimestamp,
            isGroup: true,
            groupName: chatData.groupName || 'Group Chat',
            createdBy: chatData.createdBy,
            groupPhotoURL: chatData.groupPhotoURL || null, // <<< Get groupPhotoURL
            isNewlyAdded: false,
          };
        } else if (chatData.participantIds.length === 2) {
          // --- Handle Direct Chat ---
          const otherUserId = chatData.participantIds.find(id => id !== currentUser?.uid);
          if (otherUserId) {
            try {
              const userDocRef = doc(db, "users", otherUserId);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const otherParticipantData: ParticipantDetails = {
                  uid: otherUserId,
                  displayName: userData.displayName || 'Unknown User',
                  // <<< Ensure photoURL is string | null >>>
                  photoURL: userData.photoURL || null
                };
                chatItem = {
                  id: chatId,
                  participantIds: chatData.participantIds,
                  lastMessage: chatData.lastMessage,
                  lastMessageTimestamp: chatData.lastMessageTimestamp,
                  otherParticipant: otherParticipantData,
                  isNewlyAdded: false,
                  isGroup: false,
                  groupPhotoURL: null, // Explicitly null for direct chats
                };
              } else {
                console.warn(`User profile not found for ID: ${otherUserId} in chat ${chatId}`);
              }
            } catch (userFetchError) {
              console.error(`Failed to fetch details for user ${otherUserId} in chat ${chatId}:`, userFetchError);
            }
          }
        } else {
          console.warn(`Skipping chat ${chatId}: Not a group and participant count is not 2.`);
        }
        return chatItem;
      }));

      // ... existing result processing and sorting ...
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          fetchedChats.push(result.value);
        } else if (result.status === 'rejected') {
          console.error("Error processing a chat document:", result.reason);
        }
      });

      fetchedChats.sort((a, b) => {
        const timeA = a.lastMessageTimestamp?.toMillis() ?? 0;
        const timeB = b.lastMessageTimestamp?.toMillis() ?? 0;
        return timeB - timeA;
      });

      setChats(fetchedChats);
      setIsLoading(false);
      setError(null);
    }, (err) => {
      // ... existing error handling ...
    });

    return () => {
      console.log("Cleaning up chat listener.");
      unsubscribe();
    };
  }, [currentUser]);

  // --- useEffect to fetch details for addedUsers ---
  useEffect(() => {
    // ... existing implementation ...
    // Ensure photoURL is handled as string | null
    if (!addedUsers || addedUsers.length === 0) {
      setAddedUsersDetails({});
      return;
    }

    const fetchAddedUsersDetails = async () => {
      const detailsMap = await addedUsers.reduce(async (mapPromise, user) => {
        const map = await mapPromise;
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            map[user.uid] = {
              uid: user.uid,
              displayName: userData.displayName || user.displayName || 'User',
              photoURL: userData.photoURL || user.photoURL || null // <<< Ensure null fallback
            };
          } else {
            console.warn(`User profile not found for added user ID: ${user.uid}`);
            map[user.uid] = { ...user, photoURL: user.photoURL || null }; // <<< Ensure null fallback
          }
        } catch (fetchError) {
          console.error(`Failed to fetch details for added user ${user.uid}:`, fetchError);
          map[user.uid] = { ...user, photoURL: user.photoURL || null }; // <<< Ensure null fallback
        }
        return map;
      }, Promise.resolve<{ [key: string]: ParticipantDetails }>({}));

      setAddedUsersDetails(detailsMap);
    };

    fetchAddedUsersDetails();

  }, [addedUsers]);

  // Combine Firestore chats and newly added users for display
  const combinedChats = (): ChatItem[] => {
    // ... existing logic ...
    const existingChatUserIds = new Set(chats.filter(c => !c.isGroup).map(chat => chat.otherParticipant?.uid));
    const uniqueAddedUsers = addedUsers.filter(user => !existingChatUserIds.has(user.uid));

    const addedChatItems: ChatItem[] = uniqueAddedUsers.map(user => {
      const details = addedUsersDetails[user.uid] || user;
      return {
        id: `temp_${user.uid}`,
        participantIds: [currentUser?.uid || '', user.uid],
        lastMessage: "Tap to start chat",
        lastMessageTimestamp: null,
        otherParticipant: {
          uid: details.uid,
          displayName: details.displayName,
          photoURL: details.photoURL // Already string | null
        },
        isNewlyAdded: true,
        isGroup: false,
        groupPhotoURL: null, // Explicitly null
      };
    });

    return [...addedChatItems, ...chats];
  };

  // --- Prepare list of users for Group Chat creation ---
  const availableUsersForGroup = useMemo(() => {
    // ... existing implementation ...
    // Ensure photoURL is handled as string | null
    const usersMap = new Map<string, ParticipantDetails>();

    chats.forEach(chat => {
      if (chat.otherParticipant && !usersMap.has(chat.otherParticipant.uid)) {
        usersMap.set(chat.otherParticipant.uid, chat.otherParticipant);
      }
    });

    addedUsers.forEach(pendingUser => {
      if (!usersMap.has(pendingUser.uid)) {
        const details = addedUsersDetails[pendingUser.uid] || pendingUser;
        // Ensure photoURL is null if missing
        usersMap.set(details.uid, { ...details, photoURL: details.photoURL || null });
      }
    });

    return Array.from(usersMap.values());
  }, [chats, addedUsers, addedUsersDetails]);

  // Helper to format timestamp
  const formatTimestamp = (timestamp: Timestamp | null): string => {
    // ... existing implementation ...
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  // Handle clicking on a chat item
  const handleItemClick = async (item: ChatItem) => {
    // ... existing setup ...
    if (!currentUser) return;

    if (item.isGroup) {
      // --- Handle Group Chat Click ---
      const groupDetails: ParticipantDetails = {
        uid: item.id,
        displayName: item.groupName || 'Group Chat',
        // <<< Use groupPhotoURL from ChatItem >>>
        photoURL: item.groupPhotoURL || null,
        isGroup: true,
      };
      console.log(`[Chatlist] handleItemClick (Group): Navigating to group chat ${item.id}`);
      onChatSelect(groupDetails, item.id);

    } else if (item.isNewlyAdded && item.otherParticipant) {
      // --- Handle Newly Added User Click ---
      setCreatingChatId(item.otherParticipant.uid);
      setError(null);
      try {
        console.log(`Attempting to create chat with ${item.otherParticipant.displayName}`);
        const chatId = await createChat(currentUser.uid, item.otherParticipant.uid);

        if (chatId) {
          console.log("Chat created/found successfully:", chatId);
          // Pass user details and the new/existing chatId
          onChatSelect(item.otherParticipant, chatId);
        } else {
          setError(`Could not start chat with ${item.otherParticipant.displayName}.`);
        }
      } catch (error: any) {
        console.error("Error creating chat on click:", error);
        setError(error.message || `Failed to start chat with ${item.otherParticipant.displayName}.`);
      } finally {
        setCreatingChatId(null);
      }
    } else if (item.otherParticipant) {
      // --- Handle Existing Direct Chat Click ---
      console.log(`[Chatlist] handleItemClick (Existing Direct): Navigating to chat ${item.id}`);
      onChatSelect(item.otherParticipant, item.id);
    } else {
      console.error("Cannot select chat: Invalid item data.", item);
    }
  };

  // Handle clicking the delete button on a newly added item
  const handleDeleteItem = (event: React.MouseEvent, userId: string) => {
    // ... existing implementation ...
    event.stopPropagation();
    console.log(`Deleting pending user: ${userId}`);
    onRemoveUserToAdd(userId);
  };

  // --- Group Chat Handlers ---
  const handleCreateGroupClick = () => {
    setIsCreatingGroup(true);
  };

  const handleCancelGroupCreation = () => {
    setIsCreatingGroup(false);
    setError(null); // Clear any errors from the modal
  };

  // --- UPDATED: handleGroupCreated (now receives groupPhotoURL) ---
  const handleGroupCreated = async (groupName: string, selectedUserIds: string[], groupPhotoURL?: string | null) => {
    if (!currentUser) {
      console.error("Cannot create group: No current user.");
      setError("Authentication error. Please try again."); // Show error in Chatlist
      setIsCreatingGroup(false);
      return;
    }
    console.log(`Attempting to create group "${groupName}" with users:`, selectedUserIds);

    try {
      // Call the actual service function
      const newGroupId = await createGroupChat(currentUser.uid, groupName, selectedUserIds, groupPhotoURL);
      if (newGroupId) {
        console.log("Group created successfully with ID:", newGroupId);
        // Close modal - success! Chat will appear via listener.
        setIsCreatingGroup(false);
        // Optionally navigate immediately (or let user click the new chat item)
        // const groupDetails: ParticipantDetails = { uid: newGroupId, displayName: groupName, photoURL: groupPhotoURL || null, isGroup: true };
        // onChatSelect(groupDetails, newGroupId);
      } else {
        console.error("Group creation failed, function returned null.");
        setError("Failed to create group. Please try again."); // Show error in Chatlist
        // Keep modal open if creation failed in service
      }
    } catch (error: any) {
      console.error("Error during group creation:", error);
      setError(error.message || "Failed to create group."); // Show error in Chatlist
      // Keep modal open on error
    }
    // Removed finally block that closed modal, handle based on success/failure now
  };

  const displayChats = useMemo(() => {
    const combined = combinedChats();

    // Sort combined list
    combined.sort((a, b) => {
      const timeA = a.lastMessageTimestamp?.toMillis() ?? 0;
      const timeB = b.lastMessageTimestamp?.toMillis() ?? 0;
      return timeB - timeA;
    });

    return combined; // Return the combined and sorted list

  }, [addedUsers, chats, currentUser]); // <<< Remove searchQuery dependency

  return (
    <div className="chatlist-container" ref={containerRef}>
      {/* Add Screen Title */}
      <h2 className="screen-title">Chats</h2>

      {/* Conditional Rendering */}
      {isLoading && displayChats.length === 0 ? (
        // ... loading indicator ...
        <div className="loading-screen" style={{ height: 'calc(100% - 120px)'}}>
          <div className="loading-spinner"></div>
        </div>
      ) : error && displayChats.length === 0 ? (
        // ... error message ...
        <div className="search-placeholder" style={{ height: 'calc(100% - 120px)'}}>
          <p className="placeholder-text" style={{ color: '#ff5555' }}>{error}</p>
        </div>
      ) : displayChats.length === 0 ? (
        <NoUsers onSearchClick={onNavigateToSearch} />
      ) : (
        <div className="chat-list">
          {displayChats.map((chat) => {
            // <<< Update display name and photo URL logic >>>
            const displayName = chat.isGroup ? chat.groupName : chat.otherParticipant?.displayName;
            // Use groupPhotoURL if it's a group and exists, otherwise default group avatar
            // Use otherParticipant photoURL if direct chat, otherwise default user avatar
            const photoURL = chat.isGroup
              ? (chat.groupPhotoURL || defaultGroupAvatar)
              : (chat.otherParticipant?.photoURL || defaultAvatar); // Use default user avatar here
            const altText = chat.isGroup ? (chat.groupName || 'Group') : (chat.otherParticipant?.displayName || 'User');

            return (
              <div
                key={chat.id}
                className={`chat-item ${chat.isNewlyAdded ? 'newly-added' : ''}`}
                onClick={() => handleItemClick(chat)}
              >
                <div className="chat-avatar">
                  <img
                    // <<< Use the determined photoURL >>>
                    src={photoURL}
                    alt={altText}
                    // Add error handler for images
                    onError={(e) => (e.currentTarget.src = chat.isGroup ? defaultGroupAvatar : defaultAvatar)}
                  />
                </div>
                <div className="chat-info">
                  <div className="chat-header">
                    <h3 className="chat-name">{displayName || (chat.isGroup ? 'Group Chat' : 'Chat')}</h3>
                    {!chat.isNewlyAdded && (
                      <span className="chat-time">{formatTimestamp(chat.lastMessageTimestamp)}</span>
                    )}
                  </div>
                  <div className="chat-preview">
                    {creatingChatId === chat.otherParticipant?.uid && !chat.isGroup ? (
                      <p className="chat-message" style={{ fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.5)' }}>Starting chat...</p>
                    ) : (
                      <p className={`chat-message ${chat.isNewlyAdded ? 'placeholder-message' : ''}`}>
                        {chat.lastMessage || (chat.isNewlyAdded ? 'Tap to start chat' : 'No messages yet')}
                      </p>
                    )}
                  </div>
                </div>
                {chat.isNewlyAdded && !chat.isGroup && chat.otherParticipant && (
                  <button
                    className="delete-pending-btn"
                    onClick={(e) => handleDeleteItem(e, chat.otherParticipant!.uid)}
                    aria-label={`Remove ${chat.otherParticipant.displayName}`}
                  >
                    {/* ... delete icon svg ... */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
          {/* Display general error if occurred during chat creation click or group creation */}
          {error && !isLoading && <p className="chatlist-error">{error}</p>}
        </div>
      )}

      {/* Action Buttons Container */}
      <div className="action-buttons-container">
        <button
          className="action-button new-chat-button"
          onClick={handleCreateGroupClick}
          title="Create Group"
        >
          <img src={groupIcon} alt="Create Group" className="group-icon" />
        </button>
      </div>

      {/* Render Group Chat Modal */}
      {isCreatingGroup && currentUser && (
        <GroupChat
          currentUser={currentUser}
          availableUsers={availableUsersForGroup}
          onCreateGroup={handleGroupCreated} // Pass the async handler
          onCancel={handleCancelGroupCreation}
        />
      )}
    </div>
  );
};

// Import default user avatar
import defaultAvatar from '../assets/default-avatar.png';

export default Chatlist;
