import { useState } from 'react';
import { User } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore'; // Assuming you'll need this later
import '../styles/ChatSystem.css';
// Remove SVG imports
// import attachIcon from '../assets/icons/Attach.svg'; 
// import sendIcon from '../assets/icons/Send.svg';

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
  // Add state for messages later: const [messages, setMessages] = useState([]);

  const handleSendMessage = () => {
    if (messageText.trim() === '') return;
    console.log(`Sending message: ${messageText} in chat ${chatId}`);
    // TODO: Implement message sending logic using Firebase
    setMessageText('');
  };

  const handleAttachImage = () => {
    console.log(`Attach image clicked in chat ${chatId}`);
    // TODO: Implement image attachment logic
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
      {/* Header is now handled by the main App Header */}
      
      {/* Message Area */}
      <div className="message-area">
        {/* Messages will be rendered here */}
        <div className="message-placeholder">
          <span>Start your conversation!</span>
        </div>
      </div>

      {/* Input Area */}
      <div className="input-area">
        <button className="attach-button" onClick={handleAttachImage}>
          {/* Replace img with Unicode character */}
          <span>📎</span> 
        </button>
        <input
          type="text"
          placeholder="Type a message..."
          value={messageText}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
        />
        <button className="send-button" onClick={handleSendMessage} disabled={!messageText.trim()}>
          {/* Replace img with Unicode character */}
          <span>➤</span> 
        </button>
      </div>
    </div>
  );
};

export default ChatSystem;
