import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, updateUserProfile, isUsernameTaken } from '../services/firebase';
import { uploadImage } from '../services/cloudinary'; // Assuming you have this service
// Import styles - create a new CSS file or reuse/adapt KYC.css/Profile.css
import '../styles/ProfileUpdate.css'; // Create this CSS file

interface ProfileUpdateProps {
  user: User;
  onUpdateComplete: () => void; // Callback function after successful update
  onCancel: () => void; // Callback function to go back
}

interface UserProfileData {
  displayName: string;
  username: string;
  photoURL: string;
  // Add bio if you want to edit it here
  // bio?: string;
}

const ProfileUpdate = ({ user, onUpdateComplete, onCancel }: ProfileUpdateProps) => {
  const [profile, setProfile] = useState<UserProfileData>({
    displayName: '',
    username: '',
    photoURL: '',
  });
  const [initialUsername, setInitialUsername] = useState<string>(''); // Store initial username
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true); // For initial data fetch
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const usernameCheckTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch existing profile data on load
  useEffect(() => {
    const fetchProfile = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          const fetchedProfile = {
            displayName: data.displayName || user.displayName || '',
            username: data.username || '',
            photoURL: data.photoURL || user.photoURL || '/src/assets/default-avatar.png',
          };
          setProfile(fetchedProfile);
          setInitialUsername(fetchedProfile.username); // Store initial username
          setPreviewImage(fetchedProfile.photoURL);
        } else {
          // Initialize with auth data if no Firestore doc exists (shouldn't happen after KYC)
          const initialProfile = {
            displayName: user.displayName || '',
            username: '', // Or try to derive from email?
            photoURL: user.photoURL || '/src/assets/default-avatar.png',
          };
          setProfile(initialProfile);
          setPreviewImage(initialProfile.photoURL);
          setError("Profile data not found, using defaults.");
        }
      } catch (err) {
        console.error("Error fetching profile for update:", err);
        setError("Failed to load profile data.");
        // Set defaults even on error
        setProfile({
          displayName: user.displayName || '',
          username: '',
          photoURL: user.photoURL || '/src/assets/default-avatar.png',
        });
        setPreviewImage(user.photoURL || '/src/assets/default-avatar.png');
      } finally {
        setIsFetching(false);
      }
    };
    fetchProfile();
  }, [user]);

  // Clear username check timer on unmount
  useEffect(() => {
    return () => {
      if (usernameCheckTimer.current) {
        clearTimeout(usernameCheckTimer.current);
      }
    };
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));

    if (error) setError(null);
    if (name === 'username') {
      setUsernameError(null); // Clear username error on typing
      checkUsernameAvailability(value); // Trigger debounced check
    }
  };

  const checkUsernameAvailability = (username: string) => {
    if (usernameCheckTimer.current) {
      clearTimeout(usernameCheckTimer.current);
    }
    const trimmedValue = username.trim();

    // Basic validation
    if (trimmedValue && !/^[a-zA-Z0-9_]+$/.test(trimmedValue)) {
      setUsernameError('Use letters, numbers, underscores only.');
      setUsernameChecking(false);
      return;
    }
     if (trimmedValue === initialUsername) { // No need to check if it hasn't changed
        setUsernameError(null);
        setUsernameChecking(false);
        return;
     }
     if (!trimmedValue) {
        setUsernameChecking(false);
        setUsernameError(null);
        return;
     }

    setUsernameChecking(true);
    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const taken = await isUsernameTaken(trimmedValue);
        if (taken) {
          setUsernameError('Username is already taken.');
        } else {
          setUsernameError(null);
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameError('Could not verify username.');
      } finally {
        setUsernameChecking(false);
      }
    }, 750); // Debounce time
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Max 2MB
        setError('Image size must be less than 2MB');
        setSelectedFile(null);
        setPreviewImage(profile.photoURL); // Revert preview
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null); // Clear general error
    } else {
        // Handle case where user cancels file selection
        setSelectedFile(null);
        setPreviewImage(profile.photoURL); // Revert to original photo
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const finalUsername = profile.username.trim();

    // Validation
    if (!profile.displayName || !finalUsername) {
      setError('Display Name and Username are required.');
      setIsLoading(false);
      return;
    }
    if (usernameError) {
      setError('Please fix the errors before submitting.');
      setIsLoading(false);
      return;
    }
     if (finalUsername !== initialUsername && !usernameChecking) {
        // Re-check username if it changed and check isn't currently running
        try {
            const taken = await isUsernameTaken(finalUsername);
            if (taken) {
                setUsernameError('Username is already taken.');
                setError('Please fix the errors before submitting.');
                setIsLoading(false);
                return;
            }
        } catch (err) {
             setError('Could not verify username. Please try again.');
             setIsLoading(false);
             return;
        }
     }


    try {
      let photoURL = profile.photoURL; // Start with current URL

      // Upload new image if selected
      if (selectedFile) {
        try {
          photoURL = await uploadImage(selectedFile);
          console.log('New image uploaded:', photoURL);
        } catch (uploadError: any) {
          console.error('Image upload failed:', uploadError);
          // Decide how to handle: stop submission or proceed without new image?
          // For now, proceed but show error.
          setError(`Failed to upload image: ${uploadError.message}. Profile will be saved without the new image.`);
          // photoURL remains the old one
        }
      }

      // Prepare data for update (only include changed fields if necessary, or send all)
      const updateData = {
        displayName: profile.displayName.trim(),
        username: finalUsername,
        photoURL: photoURL, // Use new or old URL
        // Add bio here if editing: bio: profile.bio || ''
      };

      // Call updateUserProfile (ensure it only updates provided fields)
      await updateUserProfile(user.uid, updateData);

      console.log('Profile updated successfully!');
      onUpdateComplete(); // Call the success callback

    } catch (err: any) {
      console.error('Profile update error:', err);
      if (!error?.includes('Failed to upload image')) { // Avoid overwriting upload error message
         setError(err.message || 'An unexpected error occurred during update.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <div className="profile-update-loading">Loading profile data...</div>;
  }

  return (
    <div className="profile-update-container"> {/* Use a specific class */}
      <h2>Edit Profile</h2>
      <form onSubmit={handleSubmit}>
        {/* Image Upload */}
        <div className="form-group form-group-photo">
          <label htmlFor="photo" className="photo-label">
            <div className="photo-upload-area">
              {previewImage ? (
                <img src={previewImage} alt="Preview" className="photo-preview-small" />
              ) : (
                <svg className="photo-placeholder-icon" /* ... placeholder svg ... */ ></svg>
              )}
              <div className="photo-upload-overlay">Change</div>
            </div>
          </label>
          <input
            type="file"
            id="photo"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="file-input"
            disabled={isLoading}
          />
        </div>

        {/* Display Name */}
        <div className="form-group">
          <label htmlFor="displayName">Display Name</label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            value={profile.displayName}
            onChange={handleInputChange}
            required
            disabled={isLoading}
          />
        </div>

        {/* Username */}
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={profile.username}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            maxLength={30}
            className={usernameError ? 'input-error' : ''}
          />
          <div className="input-feedback">
            {usernameChecking && <span className="username-checking">Checking...</span>}
            {usernameError && <span className="input-error-message">{usernameError}</span>}
          </div>
        </div>

        {/* Add Bio Textarea if needed */}
        {/*
        <div className="form-group">
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            name="bio"
            value={profile.bio || ''}
            onChange={handleInputChange}
            maxLength={160}
            disabled={isLoading}
          />
        </div>
        */}

        {error && <div className="error-message general-error">{error}</div>}

        <div className="form-actions">
          <button
            type="submit"
            className="submit-button"
            disabled={isLoading || usernameChecking || !!usernameError}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            className="cancel-button" // Add a cancel button
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileUpdate;
