import multer from 'multer';
import { upload } from '../helpers/cloudinaryHelper.js';

// Middleware for single profile picture upload
export const uploadProfilePicture = upload.single('profilePicture');

// Error handling middleware for multer
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name. Use "profilePicture" as the field name.'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed!'
    });
  }
  
  console.error('Upload error:', error);
  res.status(500).json({
    success: false,
    message: 'Error uploading file'
  });
};

// Middleware to check if file was uploaded
export const checkFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded. Please select an image file.'
    });
  }
  next();
};
