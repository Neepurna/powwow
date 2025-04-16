import { useState, useRef, ChangeEvent, useEffect } from 'react'; // Import useEffect
import { User } from 'firebase/auth';
import { updateUserProfile, isUsernameTaken, signOut, db } from '../services/firebase'; // Import db
import { doc, getDoc } from "firebase/firestore"; // Import firestore functions
import { uploadImage } from '../services/cloudinary';
import '../styles/KYC.css';

interface KYCProps {
  user: User;
  onComplete: () => void;
}

interface UserProfile {
  displayName: string;
  username: string;
  dateOfBirth: string;
  gender: string;
  photoURL: string;
}

const KYC = ({ user, onComplete }: KYCProps) => {
  // Initialize with current user data if available
  const [profile, setProfile] = useState<UserProfile>({
    displayName: user.displayName || '',
    username: '',
    dateOfBirth: '',
    gender: '',
    photoURL: user.photoURL || '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(user.photoURL || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null); // Specific state for username error
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const usernameCheckTimer = useRef<NodeJS.Timeout | null>(null); // Ref for debounce timer

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (usernameCheckTimer.current) {
        clearTimeout(usernameCheckTimer.current);
      }
    };
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setProfile(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear general error if user types in any field
    if (error) setError(null);
    // Clear username error specifically if user types in username field
    if (name === 'username' && usernameError) setUsernameError(null);

    if (name === 'username') {
      // Clear existing timer if user is still typing
      if (usernameCheckTimer.current) {
        clearTimeout(usernameCheckTimer.current);
      }

      const trimmedValue = value.trim();

      // Immediate client-side validation for username
      if (value !== trimmedValue) {
        setUsernameError('Username cannot contain spaces.');
        setUsernameChecking(false);
        return;
      }
       if (trimmedValue && !/^[a-zA-Z0-9_]+$/.test(trimmedValue)) {
        setUsernameError('Use letters, numbers, underscores only.');
        setUsernameChecking(false);
        return;
      }
      if (!trimmedValue) {
         setUsernameChecking(false);
         return;
      }

      // Debounce the check
      setUsernameChecking(true);
      usernameCheckTimer.current = setTimeout(async () => {
        try {
          const taken = await isUsernameTaken(trimmedValue);
          if (taken) {
            setUsernameError('This username is already taken.');
          } else {
            // Username is valid and available
            setUsernameError(null); // Explicitly clear error on success
          }
        } catch (err: any) {
          console.error('Error checking username:', err);
          setUsernameError(err.message || 'Could not verify username.');
        } finally {
          setUsernameChecking(false);
        }
      }, 750);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }

    setSelectedFile(file);

    // Create a local preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null); // Clear general error
    setUsernameError(null); // Clear username error

    const finalUsername = profile.username.trim();

    try {
      // === Pre-submission Validation ===
      if (!profile.displayName || !finalUsername || !profile.dateOfBirth || !profile.gender) {
        throw new Error('Please fill in all required fields.');
      }
      if (/\s/.test(profile.username)) {
         setUsernameError('Username cannot contain spaces.'); // Set specific error
         throw new Error('Username cannot contain spaces.');
      }
      if (!/^[a-zA-Z0-9_]+$/.test(finalUsername)) {
         setUsernameError('Use letters, numbers, underscores only.'); // Set specific error
        throw new Error('Username format is invalid.');
      }

      // Age validation
      const birthDate = new Date(profile.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 13) {
        throw new Error('You must be at least 13 years old.');
      }

      // === Final Username Uniqueness Check ===
      console.log("Performing final username check before submission...");
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef); // Use different name
        const existingUsername = userDocSnap.exists() ? userDocSnap.data().username : null;

        if (existingUsername !== finalUsername) {
           const usernameTaken = await isUsernameTaken(finalUsername);
           if (usernameTaken) {
             setUsernameError('This username is already taken.'); // Set specific error
             throw new Error('This username is already taken.');
           }
           console.log("Final username check passed.");
        } else {
           console.log("Username hasn't changed, skipping final check.");
        }
      } catch (checkError: any) {
         console.error("Final username check failed:", checkError);
         // Rethrow the specific error from isUsernameTaken or a generic one
         const specificErrorMsg = checkError.message || 'Failed to verify username.';
         if (specificErrorMsg.includes('username') || specificErrorMsg.includes('taken')) {
            setUsernameError(specificErrorMsg);
         } else {
            setError(specificErrorMsg); // Set general error for other check failures
         }
         throw new Error(specificErrorMsg);
      }

      // === Image Upload (if applicable) ===
      let photoURL = profile.photoURL;
      if (selectedFile) {
        console.log("Uploading profile image...");
        try {
          photoURL = await uploadImage(selectedFile);
          console.log('Image uploaded successfully:', photoURL);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          // Let user know upload failed but profile might still save without new image
          setError('Failed to upload profile image. Continuing without new image...');
          // Don't re-throw, allow profile update to proceed with old/default URL
        }
      }

      // === Update Profile ===
      console.log("Updating user profile in Firestore...");
      await updateUserProfile(user.uid, {
        displayName: profile.displayName.trim(),
        username: finalUsername,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        photoURL, // Use potentially updated URL
      });
      console.log("Profile update successful.");

      onComplete();

    } catch (err) {
      // Catch all errors from validation, checks, or update
      // Set general error only if usernameError isn't already set for the same issue
      if (!usernameError || !err.message?.includes('username')) {
         setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
      console.error('KYC submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
      // The app will handle redirect after auth state changes
      window.location.reload();
    } catch (error) {
      console.error("Error signing out:", error);
      setError("Failed to sign out. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="kyc-container">
      <div className="kyc-content">
        <div className="kyc-image-container">
          <img src="/src/assets/kyc.png" alt="Complete Your Profile" className="kyc-image" />
        </div>

        <form className="kyc-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group form-group-photo">
              <label htmlFor="photo" className="photo-label">
                <div className="photo-upload-area" onClick={selectImageClick}>
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="photo-preview-small" />
                  ) : (
                    <svg className="photo-placeholder-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  )}
                  <div className="photo-upload-overlay">Edit</div>
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
            <div className="form-group form-group-name">
              <label htmlFor="displayName">Full Name</label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={profile.displayName}
                onChange={handleInputChange}
                placeholder="Your Name"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={profile.username}
              onChange={handleInputChange}
              placeholder="Choose a unique username"
              required
              disabled={isLoading}
              maxLength={30}
              className={usernameError ? 'input-error' : ''} // Add error class
            />
            {/* Username specific feedback area */}
            <div className="input-feedback">
              {usernameChecking && <span className="username-checking">Checking...</span>}
              {usernameError && <span className="input-error-message">{usernameError}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group form-group-dob">
              <label htmlFor="dateOfBirth">Date of Birth</label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={profile.dateOfBirth}
                onChange={handleInputChange}
                required
                max={new Date().toISOString().split('T')[0]}
                disabled={isLoading}
              />
            </div>
            <div className="form-group form-group-gender">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                name="gender"
                value={profile.gender}
                onChange={handleInputChange}
                required
                disabled={isLoading}
              >
                <option value="" disabled>Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer-not-to-say">Prefer not</option>
              </select>
            </div>
          </div>

          {error && <div className="error-message general-error">{error}</div>}

          <button
            type="submit"
            className="submit-button"
            disabled={isLoading || usernameChecking || !!usernameError || !!error} // Disable on general error too
          >
            {isLoading ? 'Saving...' : 'Complete Profile'}
          </button>

          <button
            type="button"
            className="signout-button-alt"
            onClick={handleSignOut}
            disabled={isLoading}
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
};

export default KYC;
