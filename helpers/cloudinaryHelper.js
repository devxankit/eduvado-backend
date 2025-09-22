import cloudinary from 'cloudinary';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Validate Cloudinary configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Cloudinary configuration is missing. Please check your environment variables.');
} else {
  console.log('✅ Cloudinary configured successfully');
}

// Helper function to upload image to Cloudinary
export const uploadToCloudinary = async (buffer, folder = 'eduvado/profile-pictures', mimeType = 'image/jpeg') => {
  try {
    console.log('🔄 Starting Cloudinary upload...');
    console.log('📊 Buffer size:', buffer.length, 'bytes');
    console.log('📄 MIME type:', mimeType);
    
    // Check if file is too large (over 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      throw new Error('File too large. Please compress the image to under 5MB.');
    }
    
    // Convert buffer to base64 string
    const base64String = buffer.toString('base64');
    const dataURI = `data:${mimeType};base64,${base64String}`;
    
    console.log('📤 Uploading to Cloudinary with data URI...');
    
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { width: 500, height: 500, crop: 'fill', gravity: 'face' },
        { quality: 'auto:low' } // Use lower quality for faster upload
      ],
      timeout: 60000, // Increase timeout to 60 seconds
      chunk_size: 6000000 // Use chunked upload for large files
    });
    
    console.log('✅ Image uploaded to Cloudinary:', result.public_id);
    console.log('🔗 Image URL:', result.secure_url);
    return result;
    
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    console.error('❌ Error details:', {
      message: error?.message || 'No message',
      http_code: error?.http_code || 'No http_code',
      name: error?.name || 'No name',
      error: error?.error || 'No nested error'
    });
    throw error;
  }
};

// Helper function to delete image from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('✅ Image deleted from Cloudinary:', publicId);
    return result;
  } catch (error) {
    console.error('❌ Error deleting image from Cloudinary:', error);
    throw error;
  }
};

export default cloudinary;