import dotenv from 'dotenv';
import cloudinary from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'eduvado/profile-pictures',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 500, height: 500, crop: 'fill', gravity: 'face' },
      { quality: 'auto' }
    ],
    public_id: (req, file) => {
      // Generate unique filename with user ID and timestamp
      const userId = req.user?.userId || 'anonymous';
      const timestamp = Date.now();
      return `profile_${userId}_${timestamp}`;
    }
  }
});

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Helper function to delete image from Cloudinary
export const deleteImageFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('Cloudinary delete result:', result);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

// Helper function to upload image to Cloudinary (for direct uploads)
export const uploadImageToCloudinary = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'eduvado/profile-pictures',
      ...options
    });
    return result;
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw error;
  }
};

export { cloudinary, upload };
