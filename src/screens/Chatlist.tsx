import { useState, useRef } from 'react';
import '../styles/Chatlist.css';
import plusIcon from '../assets/icons/Plus.svg';

interface ChatItem {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
}

const Chatlist = () => {
  // Mock data for chat list - in a real app, this would come from a database or API
  const [chats] = useState<ChatItem[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      lastMessage: 'Are we still meeting at 6?',
      time: '12:30 PM',
      unread: 2,
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    {
      id: '2',
      name: 'Tech Hackathon Group',
      lastMessage: 'Alex: I just pushed the new changes',
      time: '11:15 AM',
      unread: 5,
      avatar: 'https://i.pravatar.cc/150?img=2',
    },
    {
      id: '3',
      name: 'David Chen',
      lastMessage: 'Check out this cool new library I found',
      time: 'Yesterday',
      unread: 0,
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    {
      id: '4',
      name: 'Product Team',
      lastMessage: 'Meeting notes have been uploaded',
      time: 'Yesterday',
      unread: 0,
      avatar: 'https://i.pravatar.cc/150?img=4',
    },
    {
      id: '5',
      name: 'Maria Garcia',
      lastMessage: 'Thanks for your help!',
      time: 'Monday',
      unread: 0,
      avatar: 'https://i.pravatar.cc/150?img=5',
    },
  ]);

  // Reference to the container for proper button positioning
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="chatlist-container" ref={containerRef}>
      <div className="search-container">
        <div className="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input type="text" placeholder="Search conversations" />
        </div>
      </div>

      <div className="chat-list">
        {chats.map((chat) => (
          <div key={chat.id} className="chat-item">
            <div className="chat-avatar">
              <img src={chat.avatar} alt={chat.name} />
            </div>
            <div className="chat-info">
              <div className="chat-header">
                <h3 className="chat-name">{chat.name}</h3>
                <span className="chat-time">{chat.time}</span>
              </div>
              <div className="chat-preview">
                <p className="chat-message">{chat.lastMessage}</p>
                {chat.unread > 0 && (
                  <span className="unread-badge">{chat.unread}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="new-chat-button">
        <img src={plusIcon} alt="New Chat" width="24" height="24" />
      </button>
    </div>
  );
};

export default Chatlist;
