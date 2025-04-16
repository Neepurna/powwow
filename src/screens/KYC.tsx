import { useState, useRef, ChangeEvent } from 'react';
import { User } from 'firebase/auth';
import { updateUserProfile } from '../services/firebase';
import { uploadImage } from '../services/cloudinary';
import '../styles/KYC.css';

interface KYCProps {
  user: User;
  onComplete: () => void;
}

interface UserProfile {
  displayName: string;
  dateOfBirth: string;
  gender: string;
  photoURL: string;
}

const KYC = ({ user, onComplete }: KYCProps) => {
  // Initialize with current user data if available
  const [profile, setProfile] = useState<UserProfile>({
    displayName: user.displayName || '',
    dateOfBirth: '',
    gender: '',
    photoURL: user.photoURL || '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(user.photoURL || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
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
    setError(null);

    try {
      // Validate required fields
      if (!profile.displayName || !profile.dateOfBirth || !profile.gender) {
        throw new Error('Please fill in all required fields');
      }
      
      // Calculate age to validate user is at least 13 years old
      const birthDate = new Date(profile.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 13) {
        throw new Error('You must be at least 13 years old to use this app');
      }

      let photoURL = profile.photoURL;

      // If a file was selected, upload it to Cloudinary
      if (selectedFile) {
        try {
          photoURL = await uploadImage(selectedFile);
          console.log('Image uploaded successfully:', photoURL);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          throw new Error('Failed to upload profile image. Please try again or skip the image upload.');
        }
      }
      
      // Update user profile in Firebase
      await updateUserProfile(user.uid, {
        ...profile,
        photoURL,
        isProfileComplete: true
      });
      
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('KYC submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectImageClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="kyc-container">
      <div className="kyc-header">
        <h1>Complete Your Profile</h1>
        <p>Please provide some basic information to get started</p>
      </div>

      <form className="kyc-form" onSubmit={handleSubmit}>
        <div className="avatar-section">
          <div 
            className="avatar-wrapper"
            onClick={selectImageClick}
          >
            {previewImage ? (
              <img src={previewImage} alt="User avatar" className="avatar-preview" />
            ) : (
              <div className="avatar-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64">
                  <path fill="rgba(255,255,255,0.6)" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            )}
            <div className="avatar-overlay">
              <span>Select Image</span>
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="file-input" 
          />
          <p className="avatar-hint">Profile picture (optional)</p>
        </div>

        <div className="form-group">
          <label htmlFor="displayName">Full Name <span className="required">*</span></label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            value={profile.displayName}
            onChange={handleInputChange}
            placeholder="Enter your full name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="dateOfBirth">Date of Birth <span className="required">*</span></label>
          <input
            type="date"
            id="dateOfBirth"
            name="dateOfBirth"
            value={profile.dateOfBirth}
            onChange={handleInputChange}
            required
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="form-group">
          <label htmlFor="gender">Gender <span className="required">*</span></label>
          <select
            id="gender"
            name="gender"
            value={profile.gender}
            onChange={handleInputChange}
            required
          >
            <option value="" disabled>Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non-binary">Non-binary</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button 
          type="submit" 
          className="submit-button"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Complete Profile'}
        </button>
      </form>
    </div>
  );
};

export default KYC;
