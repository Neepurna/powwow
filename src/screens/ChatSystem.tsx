import { useState, useEffect, useRef, ChangeEvent } from 'react'; 
import { User } from 'firebase/auth';
import { getMessagesListener, sendMessage, Message, ParticipantDetails, db } from '../services/firebase'; 
import { doc, getDoc } from 'firebase/firestore'; // Remove unused Timestamp import
import { uploadImage } from '../services/cloudinary'; 
import '../styles/ChatSystem.css';
// Use type assertion to handle the import without a declaration file
import defaultAvatarImport from '../assets/default-avatar.js';
const defaultAvatar = defaultAvatarImport as string;

// Define SVG icons
const attachIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>`;
const sendIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;

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
  const [senderDetailsCache, setSenderDetailsCache] = useState<{ [key: string]: SenderDetails }>({}); 

  const messagesEndRef = useRef<HTMLDivElement>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null); 

  const isGroupChat = otherParticipant?.isGroup === true;

  useEffect(() => {
     if (!chatId) return;

    setIsLoadingMessages(true);
    setMessageError(null);
    setMessages([]); 
    setSenderDetailsCache({}); 

    console.log(`Setting up message listener for chat: ${chatId}`);

    const unsubscribe = getMessagesListener(
      chatId,
      async (fetchedMessages) => {
        setMessages(fetchedMessages);
        setIsLoadingMessages(false);

        const uniqueSenderIds = Array.from(
          new Set(
            fetchedMessages
              .map(msg => msg.senderId)
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
                detailsToUpdate[senderId] = { displayName: 'User', photoURL: defaultAvatar };
              }
            } catch (error) {
              console.error(`Failed to fetch details for sender ${senderId}:`, error);
              detailsToUpdate[senderId] = { displayName: 'User', photoURL: defaultAvatar };
            }
          }));

          setSenderDetailsCache(prevCache => ({ ...prevCache, ...detailsToUpdate }));
        }
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
  }, [chatId, currentUser.uid]); 

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]); 

  const handleSendMessage = async (text?: string) => { 
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

  const handleAttachImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
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
      <div className="chat-header-internal">
        <button onClick={onBack} className="chat-back-button" aria-label="Go back">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <div className="chat-title-internal">
          <img
            src={otherParticipant.photoURL || defaultAvatar}
            alt={otherParticipant.displayName}
            className="chat-title-avatar"
            onError={(e) => (e.currentTarget.src = defaultAvatar)}
          />
          <span className="chat-title-name">{otherParticipant.displayName}</span>
        </div>
        <div className="chat-header-placeholder"></div>
      </div>

      <div className="message-area">
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
              const showAvatar = !isSent; 
              const senderDetails = showAvatar ? senderDetailsCache[msg.senderId] : null; 

              return (
                <div 
                  key={msg.id} 
                  className={`message-wrapper ${isSent ? 'sent' : 'received'} ${showAvatar ? 'has-avatar' : ''}`} 
                >
                  {showAvatar && (
                    <div className="sender-avatar">
                      <img 
                        src={senderDetails?.photoURL || defaultAvatar} 
                        alt={senderDetails?.displayName || 'User'} 
                      />
                    </div>
                  )}
                  <div 
                    className={`message-bubble ${isImage ? 'image-message' : ''}`}
                  >
                    {showAvatar && (
                       <span className="sender-name">{senderDetails?.displayName || 'User'}</span>
                    )} 
                    {isImage ? (
                      <img src={content} alt="Sent image" className="message-image" />
                    ) : (
                      <p className="message-text">{content}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
        {isUploadingImage && <div className="message-placeholder">Sending image...</div>}
        {messageError && messages.length > 0 && <div className="message-placeholder error">{messageError}</div>} 
        <div ref={messagesEndRef} />
      </div>

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
          <div dangerouslySetInnerHTML={{ __html: attachIconSvg }} />
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
          <div dangerouslySetInnerHTML={{ __html: sendIconSvg }} />
        </button>
      </div>
    </div>
  );
};

export default ChatSystem;
