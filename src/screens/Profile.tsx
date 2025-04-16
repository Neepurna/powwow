import { useState, useEffect, useRef, ChangeEvent } from 'react';
// Import the new function and remove updateUserProfile if no longer needed here
import { signOut, db, getCurrentUser, updateUserPhotoURL } from '../services/firebase'; 
import { doc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { uploadImage } from '../services/cloudinary';
import '../styles/Profile.css';

// Define a type for the profile data
interface UserProfileData {
  displayName: string;
  username: string;
  photoURL: string;
  // Add other fields like stats if they exist in Firestore
  stats?: {
    friends: number;
    groups: number;
    messages: number;
  };
}

const Profile = () => {
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true); // For initial profile load
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false); // For image upload status
  const [previewImage, setPreviewImage] = useState<string | null>(null); // For image preview
  const currentUser = getCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for hidden file input

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser) {
        setError("No user logged in.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data() as UserProfileData;
          const profileData = {
            displayName: data.displayName || currentUser.displayName || 'User',
            username: data.username || 'username',
            photoURL: data.photoURL || currentUser.photoURL || '/src/assets/default-avatar.png',
            stats: data.stats || { friends: 0, groups: 0, messages: 0 }
          };
          setUserProfile(profileData);
          setPreviewImage(profileData.photoURL); // Initialize preview with current photo
        } else {
          setError("User profile not found.");
          const defaultProfile = {
            displayName: currentUser.displayName || 'User',
            username: 'username',
            photoURL: currentUser.photoURL || '/src/assets/default-avatar.png',
            stats: { friends: 0, groups: 0, messages: 0 }
          };
          setUserProfile(defaultProfile);
          setPreviewImage(defaultProfile.photoURL);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError("Failed to load profile.");
        const errorProfile = {
          displayName: currentUser?.displayName || 'User',
          username: 'username',
          photoURL: currentUser?.photoURL || '/src/assets/default-avatar.png',
          stats: { friends: 0, groups: 0, messages: 0 }
        };
        setUserProfile(errorProfile);
        setPreviewImage(errorProfile.photoURL);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.reload();
    } catch (logoutError) {
      console.error("Logout failed:", logoutError);
      setError("Logout failed. Please try again.");
    }
  };

  // Trigger hidden file input when edit avatar button is clicked
  const handleEditAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection, preview, and trigger upload
  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Removed userProfile check here as we don't need its data for the update call anymore
    if (!file || !currentUser) return; 

    // Reset errors
    setError(null);

    // Validate file size (e.g., max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      if (fileInputRef.current) fileInputRef.current.value = ''; // Clear input
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Start the upload process
    setIsUploading(true);
    try {
      console.log("Uploading image...");
      const newPhotoURL = await uploadImage(file);
      console.log("Image uploaded, URL:", newPhotoURL);

      // Update Firestore using the new dedicated function
      await updateUserPhotoURL(currentUser.uid, newPhotoURL); // Use the new function
      console.log("Firestore updated with new photoURL.");

      // Update local state
      setUserProfile(prev => prev ? { ...prev, photoURL: newPhotoURL } : null);
      // Preview is already set
    } catch (uploadError: any) {
      console.error("Failed to upload/update profile picture:", uploadError);
      setError(uploadError.message || "Failed to update profile picture.");
      setPreviewImage(userProfile?.photoURL || null); // Revert preview on error
    } finally {
      setIsUploading(false);
      // Clear the file input value after processing
      if (fileInputRef.current) fileInputRef.current.value = '';
      console.log("Upload process finished.");
    }
  };

  if (isLoading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  if (error && !isUploading) { // Don't show profile load error during upload
    return <div className="profile-error">Error: {error}</div>;
  }

  if (!userProfile) {
    return <div className="profile-error">Could not load profile.</div>;
  }

  return (
    <div className="profile-container">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        style={{ display: 'none' }}
        disabled={isUploading}
      />

      <div className="profile-header">
        {/* ... existing cover photo ... */}
        <div className="profile-avatar-container">
          <div className={`profile-avatar ${isUploading ? 'uploading' : ''}`}>
            {/* Use previewImage for immediate feedback, fallback to userProfile.photoURL */}
            <img src={previewImage || userProfile.photoURL} alt={userProfile.displayName} />
            {/* Loading overlay */}
            {isUploading && (
              <div className="avatar-upload-overlay">
                <div className="loading-spinner-small"></div>
              </div>
            )}
          </div>
          {/* Edit button now triggers file input */}
          <button
            className="edit-avatar-button"
            onClick={handleEditAvatarClick}
            disabled={isUploading} // Disable while uploading
            aria-label="Change profile picture"
          >
            {/* Changed icon to Plus (+) */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="profile-info">
        <div className="profile-name-section">
          <h1 className="profile-name">{userProfile.displayName}</h1>
          <p className="profile-username">@{userProfile.username}</p>
        </div>
        
        {/* REMOVED "Edit Profile" button */}
        
        {/* Display general error messages here */}
        {error && <p className="profile-error-inline">{error}</p>}

        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-value">{userProfile.stats?.friends ?? 0}</span>
            <span className="stat-label">Friends</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{userProfile.stats?.groups ?? 0}</span>
            <span className="stat-label">Groups</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{userProfile.stats?.messages ?? 0}</span>
            <span className="stat-label">Messages</span>
          </div>
        </div>
      </div>

      <div className="profile-sections">
        <button className="logout-button" onClick={handleLogout} disabled={isUploading}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;
