import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { User } from 'firebase/auth';
import { updateUserProfile, isUsernameTaken, signOut, db } from '../services/firebase';
import { doc, getDoc } from "firebase/firestore";
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
    photoURL: user.photoURL || '', // Use empty string as default
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(user.photoURL || null); // Allow null for default
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const usernameCheckTimer = useRef<NodeJS.Timeout | null>(null);

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

    if (error) setError(null);
    if (name === 'username' && usernameError) setUsernameError(null);

    if (name === 'username') {
      if (usernameCheckTimer.current) {
        clearTimeout(usernameCheckTimer.current);
      }

      const trimmedValue = value.trim();

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

      setUsernameChecking(true);
      usernameCheckTimer.current = setTimeout(async () => {
        try {
          const taken = await isUsernameTaken(trimmedValue);
          if (taken) {
            setUsernameError('This username is already taken.');
          } else {
            setUsernameError(null);
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
    if (!file) {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setError(null);

    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      setSelectedFile(null);
      setPreviewImage(profile.photoURL || null); // Use null instead of defaultAvatar
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result as string);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      console.error("Error reading file for preview");
      setError("Could not preview the selected image.");
      setSelectedFile(null);
      setPreviewImage(profile.photoURL || null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const finalUsername = profile.username.trim();
    let submissionErrorOccurredBeforeUpload = false;

    try {
      if (!profile.displayName || !finalUsername || !profile.dateOfBirth || !profile.gender) {
        throw new Error('Please fill in all required fields.');
      }
      if (/\s/.test(profile.username)) {
        setUsernameError('Username cannot contain spaces.');
        throw new Error('Username cannot contain spaces.');
      }
      if (!/^[a-zA-Z0-9_]+$/.test(finalUsername)) {
        setUsernameError('Use letters, numbers, underscores only.');
        throw new Error('Username format is invalid.');
      }

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

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        const existingUsername = userDocSnap.exists() ? userDocSnap.data().username : null;

        if (existingUsername !== finalUsername) {
          const usernameTaken = await isUsernameTaken(finalUsername);
          if (usernameTaken) {
            setUsernameError('This username is already taken.');
            throw new Error('This username is already taken.');
          }
        }
      } catch (checkError: any) {
        const specificErrorMsg = checkError.message || 'Failed to verify username.';
        if (specificErrorMsg.includes('username') || specificErrorMsg.includes('taken')) {
          setUsernameError(specificErrorMsg);
        } else {
          setError(specificErrorMsg);
        }
        throw new Error(specificErrorMsg);
      }

      let photoURL = profile.photoURL;
      if (selectedFile) {
        try {
          photoURL = await uploadImage(selectedFile);
        } catch (uploadError: any) {
          setError(`Failed to upload profile image: ${uploadError.message || 'Unknown error'}. Profile will be saved without the new image.`);
        }
      }

      await updateUserProfile(user.uid, {
        displayName: profile.displayName.trim(),
        username: finalUsername,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        photoURL,
      });

      onComplete();

    } catch (err: any) {
      submissionErrorOccurredBeforeUpload = !error?.startsWith('Failed to upload profile image');
      if ((!usernameError || !err.message?.includes('username')) && !error?.startsWith('Failed to upload profile image')) {
        setError(err.message || 'An unexpected error occurred during submission.');
      }
      if (selectedFile && submissionErrorOccurredBeforeUpload) {
        setError(prev => `${prev || err.message || 'An error occurred.'} (Your selected image is still ready for the next attempt)`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
      window.location.reload();
    } catch (error) {
      setError("Failed to sign out. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="kyc-container">
      <div className="kyc-content">
        <h2 className="screen-title kyc-title">Complete Profile</h2>

        <form className="kyc-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group form-group-photo">
              <label htmlFor="photo" className="photo-label">
                <div className="photo-upload-area">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="photo-preview-small" />
                  ) : (
                    <div className="photo-placeholder">+</div>
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
              className={usernameError ? 'input-error' : ''}
            />
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
            disabled={isLoading || usernameChecking || !!usernameError || !!error}
          >
            {isLoading ? 'Saving...' : 'lets Powwow!'}
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
