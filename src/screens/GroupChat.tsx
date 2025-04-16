import { useState, useRef, ChangeEvent } from 'react';
import { User } from 'firebase/auth';
import { ParticipantDetails, createGroupChat } from '../services/firebase';
import { uploadImage } from '../services/cloudinary'; // Assuming you have this service
import defaultGroupAvatar from '../assets/icons/GroupAvatar.svg'; // Default group icon
import '../styles/GroupChat.css'; // Create this CSS file

interface GroupChatProps {
  currentUser: User;
  availableUsers: ParticipantDetails[]; // Users you can add to the group
  onCreateGroup: (groupName: string, selectedUserIds: string[], groupPhotoURL?: string | null) => Promise<void>; // Pass URL back
  onCancel: () => void;
}

const GroupChat = ({ currentUser, availableUsers, onCreateGroup, onCancel }: GroupChatProps) => {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Max 2MB
        setError('Avatar image size must be less than 2MB');
        setSelectedAvatarFile(null);
        setAvatarPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file for the avatar.');
        setSelectedAvatarFile(null);
        setAvatarPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setSelectedAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null); // Clear errors
    } else {
        setSelectedAvatarFile(null);
        setAvatarPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreate = async () => {
    setError(null);
    if (!groupName.trim()) {
      setError("Group name is required.");
      return;
    }
    if (selectedUsers.size === 0) {
      setError("Select at least one member for the group.");
      return;
    }

    setIsLoading(true);
    let uploadedAvatarUrl: string | null = null;

    try {
      // 1. Upload avatar if selected
      if (selectedAvatarFile) {
        console.log("Uploading group avatar...");
        uploadedAvatarUrl = await uploadImage(selectedAvatarFile);
        console.log("Avatar uploaded:", uploadedAvatarUrl);
      }

      // 2. Prepare participant list (including current user)
      const participantIds = Array.from(selectedUsers);
      if (!participantIds.includes(currentUser.uid)) {
        participantIds.push(currentUser.uid);
      }

      // 3. Call the onCreateGroup prop (which calls createGroupChat service)
      await onCreateGroup(groupName.trim(), participantIds, uploadedAvatarUrl);

      // No need to call onCancel here, onCreateGroup should handle success/navigation
      // onCancel(); // Close modal on success - Handled by Chatlist

    } catch (err: any) {
      console.error("Failed to create group:", err);
      setError(err.message || "An error occurred while creating the group.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content group-chat-modal">
        <h2>Create New Group</h2>

        {error && <p className="modal-error">{error}</p>}

        {/* Avatar Upload */}
        <div className="group-avatar-section">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            style={{ display: 'none' }}
            disabled={isLoading}
          />
          <button className="group-avatar-button" onClick={handleAvatarClick} disabled={isLoading} title="Choose group avatar">
            <img src={avatarPreview || defaultGroupAvatar} alt="Group Avatar" className="group-avatar-preview" />
            <div className="group-avatar-overlay">
              <span>📷</span> {/* Camera Icon */}
            </div>
          </button>
        </div>

        {/* Group Name Input */}
        <div className="form-group">
          <label htmlFor="groupName">Group Name</label>
          <input
            type="text"
            id="groupName"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
            maxLength={50}
            disabled={isLoading}
          />
        </div>

        {/* User Selection List */}
        <div className="user-selection-list">
          <h3>Select Members</h3>
          {availableUsers.length === 0 ? (
            <p className="no-users-message">No contacts available to add.</p>
          ) : (
            availableUsers.map(user => (
              <div key={user.uid} className="user-selection-item">
                <input
                  type="checkbox"
                  id={`user-${user.uid}`}
                  checked={selectedUsers.has(user.uid)}
                  onChange={() => handleUserSelection(user.uid)}
                  disabled={isLoading}
                />
                <label htmlFor={`user-${user.uid}`}>
                  <img src={user.photoURL || defaultAvatar} alt={user.displayName} className="user-avatar-small" />
                  <span className="user-name">{user.displayName}</span>
                </label>
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="modal-actions">
          <button className="button-secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
          <button
            className="button-primary"
            onClick={handleCreate}
            disabled={isLoading || !groupName.trim() || selectedUsers.size === 0}
          >
            {isLoading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupChat;
