import '../styles/NoUsers.css';
import chatlistImage from '../assets/chatlist.jpg';

interface NoUsersProps {
  onSearchClick: () => void; // Prop to handle button click
}

const NoUsers = ({ onSearchClick }: NoUsersProps) => {
  return (
    <div className="no-users-container">
      <img src={chatlistImage} alt="Find friends" className="no-users-image" />
      <p className="no-users-text">
        Ok, let's find you some friends to gossip with!
      </p>
      <button className="no-users-search-button" onClick={onSearchClick}>
        Search
      </button>
    </div>
  );
};

export default NoUsers;
