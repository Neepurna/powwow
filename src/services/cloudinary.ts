import { Cloudinary } from '@cloudinary/url-gen';
import { auto } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';

// Initialize Cloudinary instance
export const cld = new Cloudinary({
  cloud: {
    cloudName: 'dilpgx5x8'
  }
});

// Upload image to Cloudinary using unsigned upload
export const uploadImage = async (file: File): Promise<string> => {
  try {
    // Create form data for upload
    const formData = new FormData();
    formData.append('file', file);
    // Use 'ml_default' as the upload preset - this is Cloudinary's default unsigned preset
    // Or create a specific upload preset in your Cloudinary dashboard and use that name
    formData.append('upload_preset', 'ml_default');
    formData.append('cloud_name', 'dilpgx5x8');

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/dilpgx5x8/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    // Check for errors in the response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Cloudinary error response:', errorData);
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Upload successful:', data);
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload image. Please try again later.');
  }
};

// Get optimized image URL
export const getOptimizedImageUrl = (publicId: string) => {
  return cld
    .image(publicId)
    .format('auto')
    .quality('auto')
    .resize(auto().gravity(autoGravity()).width(500).height(500))
    .toURL();
};

// Extract public ID from Cloudinary URL
export const getPublicIdFromUrl = (url: string): string => {
  if (!url) return '';
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  return filename.split('.')[0];
};
