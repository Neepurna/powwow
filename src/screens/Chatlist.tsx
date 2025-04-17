import { useState, useRef, useEffect, useMemo } from 'react';
// Import ParticipantDetails from firebase
import { db, createChat, createGroupChat, ParticipantDetails } from '../services/firebase';
// Removed unused getCurrentUser import
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import '../styles/Chatlist.css';
// Use type assertion to handle the import without a declaration file
import defaultAvatarImport from '../assets/default-avatar.js';
import NoUsers from '../components/NoUsers';
import GroupChat from './GroupChat'; // Import the new component

const defaultAvatar = defaultAvatarImport as string;

// Define SVG content at the top
const groupIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-5.33-4-7-4z"/>
</svg>`;

// Base64 encoded default group avatar
const defaultGroupAvatarBase64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzMzMzMzMyIvPjxwYXRoIGZpbGw9IiM2NjY2NjYiIGQ9Ik0xMiAxNGMyLjIxIDAgNC0xLjc5IDQtNHMtMS43OS00LTQtNC00IDEuNzktNCA0IDEuNzkgNCA0IDR6bS02IDZ2LTJjMC0yLjY2IDUuMzMtNCA4LTQgMi42NyAwIDggMS4zNCA4IDR2Mkg2eiIvPjwvc3ZnPg==';

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
    if (!currentUser) {
      return;
    }

    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("participantIds", "array-contains", currentUser.uid),
      orderBy("lastMessageTimestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const fetchedChats: ChatItem[] = [];

      const results = await Promise.allSettled(querySnapshot.docs.map(async (docSnapshot) => {
        const chatData = docSnapshot.data() as Omit<ChatItem, 'id' | 'otherParticipant' | 'isNewlyAdded'> & { groupPhotoURL?: string | null };
        const chatId = docSnapshot.id;

        let chatItem: ChatItem | null = null;

        if (chatData.isGroup) {
          chatItem = {
            id: chatId,
            participantIds: chatData.participantIds,
            lastMessage: chatData.lastMessage,
            lastMessageTimestamp: chatData.lastMessageTimestamp,
            isGroup: true,
            groupName: chatData.groupName || 'Group Chat',
            createdBy: chatData.createdBy,
            groupPhotoURL: chatData.groupPhotoURL || null,
            isNewlyAdded: false,
          };
        } else if (chatData.participantIds.length === 2) {
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
                  groupPhotoURL: null,
                };
              }
            } catch (userFetchError) {
              console.error(`Failed to fetch details for user ${otherUserId} in chat ${chatId}:`, userFetchError);
            }
          }
        }
        return chatItem;
      }));

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          fetchedChats.push(result.value);
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
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  useEffect(() => {
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
              photoURL: userData.photoURL || user.photoURL || null
            };
          } else {
            map[user.uid] = { ...user, photoURL: user.photoURL || null };
          }
        } catch (fetchError) {
          map[user.uid] = { ...user, photoURL: user.photoURL || null };
        }
        return map;
      }, Promise.resolve<{ [key: string]: ParticipantDetails }>({}));

      setAddedUsersDetails(detailsMap);
    };

    fetchAddedUsersDetails();

  }, [addedUsers]);

  const combinedChats = (): ChatItem[] => {
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
          photoURL: details.photoURL
        },
        isNewlyAdded: true,
        isGroup: false,
        groupPhotoURL: null,
      };
    });

    return [...addedChatItems, ...chats];
  };

  const availableUsersForGroup = useMemo(() => {
    const usersMap = new Map<string, ParticipantDetails>();

    chats.forEach(chat => {
      if (chat.otherParticipant && !usersMap.has(chat.otherParticipant.uid)) {
        usersMap.set(chat.otherParticipant.uid, chat.otherParticipant);
      }
    });

    addedUsers.forEach(pendingUser => {
      if (!usersMap.has(pendingUser.uid)) {
        const details = addedUsersDetails[pendingUser.uid] || pendingUser;
        usersMap.set(details.uid, { ...details, photoURL: details.photoURL || null });
      }
    });

    return Array.from(usersMap.values());
  }, [chats, addedUsers, addedUsersDetails]);

  const formatTimestamp = (timestamp: Timestamp | null): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const handleItemClick = async (item: ChatItem) => {
    if (!currentUser) return;

    if (item.isGroup) {
      const groupDetails: ParticipantDetails = {
        uid: item.id,
        displayName: item.groupName || 'Group Chat',
        photoURL: item.groupPhotoURL || null,
        isGroup: true,
      };
      onChatSelect(groupDetails, item.id);

    } else if (item.isNewlyAdded && item.otherParticipant) {
      setCreatingChatId(item.otherParticipant.uid);
      setError(null);
      try {
        const chatId = await createChat(currentUser.uid, item.otherParticipant.uid);

        if (chatId) {
          onChatSelect(item.otherParticipant, chatId);
        } else {
          setError(`Could not start chat with ${item.otherParticipant.displayName}.`);
        }
      } catch (error: any) {
        setError(error.message || `Failed to start chat with ${item.otherParticipant.displayName}.`);
      } finally {
        setCreatingChatId(null);
      }
    } else if (item.otherParticipant) {
      onChatSelect(item.otherParticipant, item.id);
    }
  };

  const handleDeleteItem = (event: React.MouseEvent, userId: string) => {
    event.stopPropagation();
    onRemoveUserToAdd(userId);
  };

  const handleCreateGroupClick = () => {
    setIsCreatingGroup(true);
  };

  const handleCancelGroupCreation = () => {
    setIsCreatingGroup(false);
    setError(null);
  };

  const handleGroupCreated = async (groupName: string, selectedUserIds: string[], groupPhotoURL?: string | null) => {
    if (!currentUser) {
      setError("Authentication error. Please try again.");
      setIsCreatingGroup(false);
      return;
    }

    try {
      const newGroupId = await createGroupChat(currentUser.uid, groupName, selectedUserIds, groupPhotoURL);
      if (newGroupId) {
        setIsCreatingGroup(false);
      } else {
        setError("Failed to create group. Please try again.");
      }
    } catch (error: any) {
      setError(error.message || "Failed to create group.");
    }
  };

  const displayChats = useMemo(() => {
    const combined = combinedChats();

    combined.sort((a, b) => {
      const timeA = a.lastMessageTimestamp?.toMillis() ?? 0;
      const timeB = b.lastMessageTimestamp?.toMillis() ?? 0;
      return timeB - timeA;
    });

    return combined;

  }, [addedUsers, chats, currentUser]);

  return (
    <div className="chatlist-container" ref={containerRef}>
      <h2 className="screen-title">Chats</h2>

      {isLoading && displayChats.length === 0 ? (
        <div className="loading-screen" style={{ height: 'calc(100% - 120px)'}}>
          <div className="loading-spinner"></div>
        </div>
      ) : error && displayChats.length === 0 ? (
        <div className="search-placeholder" style={{ height: 'calc(100% - 120px)'}}>
          <p className="placeholder-text" style={{ color: '#ff5555' }}>{error}</p>
        </div>
      ) : displayChats.length === 0 ? (
        <NoUsers onSearchClick={onNavigateToSearch} />
      ) : (
        <div className="chat-list">
          {displayChats.map((chat) => {
            const displayName = chat.isGroup ? chat.groupName : chat.otherParticipant?.displayName;
            const photoURL = chat.isGroup
              ? (chat.groupPhotoURL || defaultGroupAvatarBase64)
              : (chat.otherParticipant?.photoURL || defaultAvatar);
            const altText = chat.isGroup ? (chat.groupName || 'Group') : (chat.otherParticipant?.displayName || 'User');

            return (
              <div
                key={chat.id}
                className={`chat-item ${chat.isNewlyAdded ? 'newly-added' : ''}`}
                onClick={() => handleItemClick(chat)}
              >
                <div className="chat-avatar">
                  <img
                    src={photoURL}
                    alt={altText}
                    onError={(e) => (e.currentTarget.src = chat.isGroup ? defaultGroupAvatarBase64 : defaultAvatar)}
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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
          {error && !isLoading && <p className="chatlist-error">{error}</p>}
        </div>
      )}

      <div className="action-buttons-container">
        <button
          className="action-button new-chat-button"
          onClick={handleCreateGroupClick}
          title="Create Group"
        >
          <div dangerouslySetInnerHTML={{ __html: groupIconSvg }} className="group-icon" />
        </button>
      </div>

      {isCreatingGroup && currentUser && (
        <GroupChat
          currentUser={currentUser}
          availableUsers={availableUsersForGroup}
          onCreateGroup={handleGroupCreated}
          onCancel={handleCancelGroupCreation}
        />
      )}
    </div>
  );
};

export default Chatlist;
