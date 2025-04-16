import { useState, useEffect, useRef } from 'react'; // Add useEffect, useRef
import { User } from 'firebase/auth';
// Import Timestamp and new functions/types
import { Timestamp, getMessagesListener, sendMessage, Message } from '../services/firebase'; 
import '../styles/ChatSystem.css';

// Define the structure for the other participant's details
interface ParticipantDetails {
  uid: string;
  displayName: string;
  photoURL: string;
}

interface ChatSystemProps {
  chatId: string;
  currentUser: User;
  otherParticipant: ParticipantDetails;
  onBack: () => void; // Function to navigate back to chat list
}

const ChatSystem = ({ chatId, currentUser, otherParticipant, onBack }: ChatSystemProps) => {
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]); // State for messages
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [messageError, setMessageError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for auto-scrolling

  // --- Fetch Messages ---
  useEffect(() => {
    if (!chatId) return;

    setIsLoadingMessages(true);
    setMessageError(null);
    setMessages([]); // Clear previous messages

    console.log(`Setting up message listener for chat: ${chatId}`);

    const unsubscribe = getMessagesListener(
      chatId,
      (fetchedMessages) => {
        setMessages(fetchedMessages);
        setIsLoadingMessages(false);
      },
      (error) => {
        console.error("Failed to fetch messages:", error);
        setMessageError("Could not load messages. Please try again later.");
        setIsLoadingMessages(false);
      }
    );

    // Cleanup listener on component unmount or chatId change
    return () => {
      console.log(`Cleaning up message listener for chat: ${chatId}`);
      unsubscribe();
    };
  }, [chatId]); // Re-run effect if chatId changes

  // --- Auto-scroll to bottom ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]); // Scroll whenever messages change

  // --- Send Message ---
  const handleSendMessage = async () => {
    const textToSend = messageText.trim();
    if (textToSend === '' || !currentUser) return;

    setMessageText(''); // Clear input immediately

    try {
      await sendMessage(chatId, currentUser.uid, textToSend);
      // Message will appear automatically due to the listener
    } catch (error) {
      console.error("Failed to send message:", error);
      // Optionally: Show an error to the user, maybe revert input clear
      setMessageText(textToSend); // Re-populate input on error
      setMessageError("Failed to send message."); // Show temporary error
      // Clear error after a few seconds
      setTimeout(() => setMessageError(null), 3000);
    }
  };

  const handleAttachImage = () => {
    console.log(`Attach image clicked in chat ${chatId}`);
    // TODO: Implement image attachment logic (requires file input, upload, and sending image URL)
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent newline in input
      handleSendMessage();
    }
  };

  return (
    <div className="chat-system-container">
      {/* Header is handled by App.tsx */}
      
      {/* Message Area */}
      <div className="message-area">
        {isLoadingMessages ? (
          <div className="message-placeholder">Loading messages...</div>
        ) : messageError ? (
          <div className="message-placeholder error">{messageError}</div>
        ) : messages.length === 0 ? (
           <div className="message-placeholder">
             <span>Start your conversation!</span>
           </div>
        ) : (
          // Render actual messages (reversed in CSS, map normally)
          <>
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`message-bubble ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`}
              >
                <p className="message-text">{msg.text}</p>
                {/* Optional: Add timestamp */}
                {/* <span className="message-timestamp">
                  {msg.createdAt?.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span> */}
              </div>
            ))}
          </>
        )}
        {/* Dummy div to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-area">
        <button className="attach-button" onClick={handleAttachImage} aria-label="Attach file">
          <span>📎</span> 
        </button>
        <input
          type="text"
          placeholder="Type a message..."
          value={messageText}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          aria-label="Message input"
        />
        <button 
          className="send-button" 
          onClick={handleSendMessage} 
          disabled={!messageText.trim()}
          aria-label="Send message"
        >
          <span>➤</span> 
        </button>
      </div>
    </div>
  );
};

export default ChatSystem;
