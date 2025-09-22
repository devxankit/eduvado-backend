import dotenv from 'dotenv';
import cloudinary from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import fs from 'fs';

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
  console.error('Cloudinary configuration is missing. Please check your environment variables.');
}

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'eduvado/profile-pictures',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'],
    transformation: [
      { width: 500, height: 500, crop: 'fill', gravity: 'face' },
      { quality: 'auto' }
    ],
    public_id: (req, file) => {
      // Generate unique filename with user ID and timestamp
      const userId = req.user?.userId || 'anonymous';
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const publicId = `profile_${userId}_${timestamp}_${randomString}`;
      console.log('🔑 Generated public_id:', publicId);
      return publicId;
    }
  }
});

// Add event listeners to track Cloudinary operations
storage.on('file', (file) => {
  console.log('📁 Cloudinary storage - file event:', file.originalname);
});

storage.on('stream', (stream) => {
  console.log('🌊 Cloudinary storage - stream event');
});

storage.on('complete', (file) => {
  console.log('✅ Cloudinary storage - complete event:', file.originalname);
});

storage.on('error', (error) => {
  console.log('❌ Cloudinary storage - error event:', error);
});

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (increased from 5MB)
    files: 1, // Only allow 1 file
    fieldSize: 10 * 1024 * 1024, // 10MB field size
  },
  fileFilter: (req, file, cb) => {
    console.log('File filter processing:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Check file type - allow all image types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      'image/svg+xml'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      console.log('File type accepted:', file.mimetype);
      cb(null, true);
    } else {
      console.log('File type rejected:', file.mimetype);
      cb(new Error('Only image files are allowed! Supported formats: JPG, JPEG, PNG, GIF, WEBP, BMP, TIFF, SVG'), false);
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
