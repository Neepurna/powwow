import { useState, useEffect, useRef, ChangeEvent } from 'react'; 
import { User } from 'firebase/auth';
// Import Timestamp, getMessagesListener, sendMessage, Message, ParticipantDetails, db
import { Timestamp, getMessagesListener, sendMessage, Message, ParticipantDetails, db } from '../services/firebase'; 
// Import doc and getDoc for fetching user profiles
import { doc, getDoc } from 'firebase/firestore'; 
import { uploadImage } from '../services/cloudinary'; 
import '../styles/ChatSystem.css';
import defaultAvatar from '../assets/default-avatar.png'; 

// Interface for cached sender details
interface SenderDetails {
  displayName: string;
  photoURL: string;
}

interface ChatSystemProps {
  chatId: string;
  currentUser: User;
  otherParticipant: ParticipantDetails; 
  onBack: () => void; 
}

const ChatSystem = ({ chatId, currentUser, otherParticipant, onBack }: ChatSystemProps) => {
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]); 
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false); 
  // State to cache sender details { uid: { displayName, photoURL } }
  const [senderDetailsCache, setSenderDetailsCache] = useState<{ [key: string]: SenderDetails }>({}); 

  const messagesEndRef = useRef<HTMLDivElement>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null); 

  // Determine if it's a group chat
  const isGroupChat = otherParticipant?.isGroup === true;

  // --- Fetch Messages & Sender Details ---
  useEffect(() => {
     if (!chatId) return;

    setIsLoadingMessages(true);
    setMessageError(null);
    setMessages([]); 
    // Clear cache when chat changes
    setSenderDetailsCache({}); 

    console.log(`Setting up message listener for chat: ${chatId}`);

    const unsubscribe = getMessagesListener(
      chatId,
      async (fetchedMessages) => { // Make callback async
        setMessages(fetchedMessages);
        setIsLoadingMessages(false);

        // --- Fetch missing sender details for group chats ---
        if (isGroupChat && fetchedMessages.length > 0) {
          const uniqueSenderIds = Array.from(
            new Set(
              fetchedMessages
                .map(msg => msg.senderId)
                // Filter out current user and already cached senders
                .filter(id => id !== currentUser.uid && !senderDetailsCache[id]) 
            )
          );

          if (uniqueSenderIds.length > 0) {
            console.log("Fetching details for senders:", uniqueSenderIds);
            const detailsToUpdate: { [key: string]: SenderDetails } = {};
            await Promise.all(uniqueSenderIds.map(async (senderId) => {
              try {
                const userDocRef = doc(db, "users", senderId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                  const userData = userDocSnap.data();
                  detailsToUpdate[senderId] = {
                    displayName: userData.displayName || 'User',
                    photoURL: userData.photoURL || defaultAvatar
                  };
                } else {
                  // Cache a default if user not found
                  detailsToUpdate[senderId] = { displayName: 'User', photoURL: defaultAvatar };
                }
              } catch (error) {
                console.error(`Failed to fetch details for sender ${senderId}:`, error);
                // Cache a default on error
                detailsToUpdate[senderId] = { displayName: 'User', photoURL: defaultAvatar };
              }
            }));

            // Update cache state
            setSenderDetailsCache(prevCache => ({ ...prevCache, ...detailsToUpdate }));
          }
        }
        // --- End sender details fetch ---

      },
      (error) => {
        console.error("Failed to fetch messages:", error);
        setMessageError("Could not load messages. Please try again later.");
        setIsLoadingMessages(false);
      }
    );

    return () => {
      console.log(`Cleaning up message listener for chat: ${chatId}`);
      unsubscribe();
    };
  // Add isGroupChat and currentUser.uid to dependencies
  }, [chatId, isGroupChat, currentUser.uid]); 

  // --- Auto-scroll to bottom ---
  useEffect(() => {
    // ... existing implementation ...
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]); 

  // --- Send Message ---
  const handleSendMessage = async (text?: string) => { 
    // ... existing implementation ...
    // No changes needed here, sender details are passed but Firestore profile is used for display
    const textToSend = (text || messageText).trim(); 
    if (textToSend === '' || !currentUser) return;

    if (!text) {
      setMessageText(''); 
    }
    setMessageError(null); 

    try {
      await sendMessage(
        chatId, 
        currentUser.uid, 
        textToSend,
        currentUser.displayName, 
        currentUser.photoURL 
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      if (!text) { 
         setMessageText(textToSend); 
      }
      setMessageError("Failed to send message."); 
      setTimeout(() => setMessageError(null), 3000);
    }
  };

  // --- Attach Image ---
  const handleAttachImage = () => {
    // ... existing implementation ...
    fileInputRef.current?.click();
  };

  // --- Handle File Selection and Upload ---
  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    // ... existing implementation ...
    // No changes needed here, sender details are passed but Firestore profile is used for display
     const file = event.target.files?.[0];
    if (!file || !currentUser) {
      return;
    }

    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessageError("Image size must be less than 5MB.");
      setTimeout(() => setMessageError(null), 3000);
      return;
    }
    if (!file.type.startsWith('image/')) {
       setMessageError("Please select an image file.");
       setTimeout(() => setMessageError(null), 3000);
       return;
    }

    setIsUploadingImage(true);
    setMessageError(null); 

    try {
      const imageUrl = await uploadImage(file);
      await sendMessage(
        chatId, 
        currentUser.uid, 
        `IMAGE::${imageUrl}`,
        currentUser.displayName, 
        currentUser.photoURL 
      ); 
    } catch (error) {
      console.error("Failed to upload or send image:", error);
      setMessageError("Failed to send image.");
      setTimeout(() => setMessageError(null), 3000);
    } finally {
      setIsUploadingImage(false);
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    if (messageError) setMessageError(null); 
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
     if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); 
      handleSendMessage();
    }
  };

  return (
    <div className="chat-system-container">
      {/* Internal Chat Header */}
      <div className="chat-header-internal">
        <button onClick={onBack} className="chat-back-button" aria-label="Go back">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <div className="chat-title-internal">
          {/* Display Avatar for Group/User */}
          <img
            src={otherParticipant.photoURL || defaultAvatar}
            alt={otherParticipant.displayName}
            className="chat-title-avatar"
            onError={(e) => (e.currentTarget.src = defaultAvatar)}
          />
          <span className="chat-title-name">{otherParticipant.displayName}</span>
        </div>
        <div className="chat-header-placeholder"></div> {/* Placeholder for balance */}
      </div>

      {/* Message Area */}
      <div className="message-area">
        {/* ... loading/error/placeholder states ... */}
        {isLoadingMessages ? (
          <div className="message-placeholder">Loading messages...</div>
        ) : messageError && messages.length === 0 ? ( 
          <div className="message-placeholder error">{messageError}</div>
        ) : messages.length === 0 ? (
           <div className="message-placeholder">
             <span>{isGroupChat ? `Start chatting in ${otherParticipant.displayName}!` : 'Start your conversation!'}</span>
           </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isSent = msg.senderId === currentUser.uid;
              const isImage = msg.text.startsWith('IMAGE::');
              const content = isImage ? msg.text.substring(7) : msg.text; 
              const showAvatar = isGroupChat && !isSent; 
              // Get sender details from cache for received group messages
              const senderDetails = showAvatar ? senderDetailsCache[msg.senderId] : null; 

              return (
                <div 
                  key={msg.id} 
                  className={`message-wrapper ${isSent ? 'sent' : 'received'} ${showAvatar ? 'has-avatar' : ''}`} 
                >
                  {showAvatar && (
                    <div className="sender-avatar">
                      <img 
                        // Use cached photoURL, fallback to defaultAvatar
                        src={senderDetails?.photoURL || defaultAvatar} 
                        // Use cached displayName for alt, fallback to 'User'
                        alt={senderDetails?.displayName || 'User'} 
                      />
                    </div>
                  )}
                  <div 
                    className={`message-bubble ${isImage ? 'image-message' : ''}`}
                  >
                    {showAvatar && (
                       // Use cached displayName, fallback to 'User'
                       <span className="sender-name">{senderDetails?.displayName || 'User'}</span>
                    )} 
                    {isImage ? (
                      <img src={content} alt="Sent image" className="message-image" />
                    ) : (
                      <p className="message-text">{content}</p>
                    )}
                    {/* ... timestamp ... */}
                  </div>
                </div>
              );
            })}
          </>
        )}
        {/* ... upload indicator/error ... */}
        {isUploadingImage && <div className="message-placeholder">Sending image...</div>}
        {messageError && messages.length > 0 && <div className="message-placeholder error">{messageError}</div>} 
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-area">
        <input 
           type="file" 
           ref={fileInputRef} 
           onChange={handleFileSelected} 
           accept="image/*" 
           style={{ display: 'none' }} 
           disabled={isUploadingImage}
        />
        <button 
          className="attach-button" 
          onClick={handleAttachImage} 
          aria-label="Attach image"
          disabled={isUploadingImage} 
        >
          <span>📎</span> 
        </button>
        <input
          type="text"
          placeholder="Type a message..."
          value={messageText}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          aria-label="Message input"
          disabled={isUploadingImage} 
        />
        <button 
          className="send-button" 
          onClick={() => handleSendMessage()} 
          disabled={!messageText.trim() || isUploadingImage} 
          aria-label="Send message"
        >
          <span>➤</span> 
        </button>
      </div>
    </div>
  );
};

export default ChatSystem;
