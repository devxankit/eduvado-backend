import multer from 'multer';
import { upload } from '../helpers/cloudinaryHelper.js';

// Middleware for single profile picture upload
export const uploadProfilePicture = (req, res, next) => {
  console.log('📤 Upload middleware started');
  console.log('   Content-Type:', req.headers['content-type']);
  console.log('   Content-Length:', req.headers['content-length']);
  
  upload.single('profilePicture')(req, res, (err) => {
    if (err) {
      console.log('❌ Upload middleware error:', err);
      return handleUploadError(err, req, res, next);
    }
    
    console.log('✅ Upload middleware completed');
    if (req.file) {
      console.log('   File details:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        public_id: req.file.public_id,
        secure_url: req.file.secure_url
      });
    } else {
      console.log('   No file received');
    }
    
    next();
  });
};

// Error handling middleware for multer
export const handleUploadError = (error, req, res, next) => {
  console.error('Upload error:', error);
  
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected field name. Use "profilePicture" as the field name.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Only one file is allowed.'
        });
      case 'LIMIT_PART_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many parts in the request.'
        });
      default:
        return res.status(400).json({
          success: false,
          message: `Upload error: ${error.message}`
        });
    }
  }
  
  if (error.message && error.message.includes('Only image files are allowed')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  // Handle Cloudinary errors
  if (error.http_code) {
    return res.status(400).json({
      success: false,
      message: `Cloudinary error: ${error.message}`
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error uploading file',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// Middleware to check if file was uploaded and validate it
export const checkFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded. Please select an image file.'
    });
  }

  // Additional validation for Cloudinary uploads
  if (!req.file.public_id || !req.file.secure_url) {
    console.error('Invalid file object from Cloudinary:', req.file);
    return res.status(500).json({
      success: false,
      message: 'File upload failed. Please try again.'
    });
  }

  // Validate file size (additional check)
  if (req.file.size > 10 * 1024 * 1024) {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 10MB.'
    });
  }

  console.log('✅ File validation passed');
  next();
};
