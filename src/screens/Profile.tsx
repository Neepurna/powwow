import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { signOut, db, getCurrentUser, updateUserPhotoURL } from '../services/firebase'; 
import { doc, getDoc } from 'firebase/firestore';
import { uploadImage } from '../services/cloudinary';
import defaultAvatar from '../assets/default-avatar.js';
import Share from '../components/Share';
import '../styles/Profile.css';

// SVG icons
const logoutIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
  <path fill="currentColor" d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
</svg>`;

const editAvatarIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
  <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
</svg>`;

// Define a type for the profile data
interface UserProfileData {
  displayName: string;
  username: string;
  photoURL: string;
  stats?: {
    friends: number;
    groups: number;
    messages: number;
  };
}

const Profile = () => {
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const currentUser = getCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            photoURL: data.photoURL || currentUser.photoURL || defaultAvatar,
            stats: data.stats || { friends: 0, groups: 0, messages: 0 }
          };
          setUserProfile(profileData);
          setPreviewImage(profileData.photoURL);
        } else {
          setError("User profile not found.");
          const defaultProfile = {
            displayName: currentUser.displayName || 'User',
            username: 'username',
            photoURL: currentUser.photoURL || defaultAvatar,
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
          photoURL: currentUser?.photoURL || defaultAvatar,
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

  const handleEditAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setError(null);

    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      console.log("Uploading image...");
      const newPhotoURL = await uploadImage(file);
      console.log("Image uploaded, URL:", newPhotoURL);

      await updateUserPhotoURL(currentUser.uid, newPhotoURL);
      console.log("Firestore updated with new photoURL.");

      setUserProfile(prev => prev ? { ...prev, photoURL: newPhotoURL } : null);
    } catch (uploadError: any) {
      console.error("Failed to upload/update profile picture:", uploadError);
      setError(uploadError.message || "Failed to update profile picture.");
      setPreviewImage(userProfile?.photoURL || null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      console.log("Upload process finished.");
    }
  };

  const handleInviteClick = () => {
    setShowShareModal(true);
  };

  if (isLoading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  if (error && !isUploading) {
    return <div className="profile-error">Error: {error}</div>;
  }

  if (!userProfile) {
    return <div className="profile-error">Could not load profile.</div>;
  }

  return (
    <div className="profile-container">
      <h2 className="screen-title">Profile</h2>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        style={{ display: 'none' }}
        disabled={isUploading}
      />

      <div className="profile-scroll-content">
        <div className="profile-header">
          <div className="profile-avatar-container">
            <div className={`profile-avatar ${isUploading ? 'uploading' : ''}`}>
              <img src={previewImage || userProfile.photoURL} alt={userProfile.displayName} />
              {isUploading && (
                <div className="avatar-upload-overlay">
                  <div className="loading-spinner-small"></div>
                </div>
              )}
            </div>
            <button
              className="edit-avatar-button"
              onClick={handleEditAvatarClick}
              disabled={isUploading}
              aria-label="Change profile picture"
            >
              <div dangerouslySetInnerHTML={{ __html: editAvatarIconSvg }} />
            </button>
          </div>
        </div>

        <div className="profile-info">
          <div className="profile-name-section">
            <h1 className="profile-name">{userProfile.displayName}</h1>
            <p className="profile-username">@{userProfile.username}</p>
          </div>
          {error && <p className="profile-error-inline">{error}</p>}
        </div>

        <div className="profile-sections">
          <button 
            className="invite-friends-button" 
            onClick={handleInviteClick}
            disabled={isUploading}
          >
            Invite friends for some Powwow Fun!
          </button>

          <button className="logout-button" onClick={handleLogout} disabled={isUploading}>
            <span dangerouslySetInnerHTML={{ __html: logoutIconSvg }}></span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {showShareModal && (
        <Share
          url="https://powwwow.netlify.app"
          title="Join me on Powwow!"
          text="Let's chat on Powwow! It's simple, secure messaging."
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default Profile;
