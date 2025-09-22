import express from 'express';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';
import { uploadProfilePicture, handleUploadError, checkFileUpload } from '../middleware/uploadMiddleware.js';
import { deleteImageFromCloudinary } from '../helpers/cloudinaryHelper.js';

const router = express.Router();

// Global error handler for upload routes
router.use((error, req, res, next) => {
  if (error) {
    console.error('Upload route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Upload error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
  next();
});

// Upload profile picture
router.post('/upload-picture', 
  verifyToken, 
  uploadProfilePicture, 
  checkFileUpload,
  async (req, res) => {
    try {
      const userId = req.user.userId;
      console.log('Uploading profile picture for user:', userId);
      
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Validate file upload
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      console.log('File uploaded successfully:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        public_id: req.file.public_id,
        secure_url: req.file.secure_url
      });

      // Store old profile picture info for cleanup
      const oldProfilePicture = user.profilePicture;

      // Update user with new profile picture
      user.profilePicture = {
        publicId: req.file.public_id,
        url: req.file.secure_url
      };

      // Save user first
      await user.save();

      // Delete old profile picture after successful save
      if (oldProfilePicture && oldProfilePicture.publicId) {
        try {
          console.log('Deleting old profile picture:', oldProfilePicture.publicId);
          await deleteImageFromCloudinary(oldProfilePicture.publicId);
          console.log('✅ Old profile picture deleted successfully');
        } catch (error) {
          console.error('Error deleting old profile picture:', error);
          // Don't fail the request if old image deletion fails
        }
      }

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        profilePicture: {
          publicId: user.profilePicture.publicId,
          url: user.profilePicture.url
        }
      });

    } catch (error) {
      console.error('Error uploading profile picture:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading profile picture',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Update profile picture (same as upload, replaces existing)
router.put('/update-picture', 
  verifyToken, 
  uploadProfilePicture, 
  checkFileUpload,
  async (req, res) => {
    try {
      const userId = req.user.userId;
      console.log('Updating profile picture for user:', userId);
      
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Validate file upload
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      console.log('File updated successfully:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        public_id: req.file.public_id,
        secure_url: req.file.secure_url
      });

      // Store old profile picture info for cleanup
      const oldProfilePicture = user.profilePicture;

      // Update user with new profile picture
      user.profilePicture = {
        publicId: req.file.public_id,
        url: req.file.secure_url
      };

      // Save user first
      await user.save();

      // Delete old profile picture after successful save
      if (oldProfilePicture && oldProfilePicture.publicId) {
        try {
          console.log('Deleting old profile picture:', oldProfilePicture.publicId);
          await deleteImageFromCloudinary(oldProfilePicture.publicId);
          console.log('✅ Old profile picture deleted successfully');
        } catch (error) {
          console.error('Error deleting old profile picture:', error);
          // Don't fail the request if old image deletion fails
        }
      }

      res.json({
        success: true,
        message: 'Profile picture updated successfully',
        profilePicture: {
          publicId: user.profilePicture.publicId,
          url: user.profilePicture.url
        }
      });

    } catch (error) {
      console.error('Error updating profile picture:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating profile picture',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Delete profile picture
router.delete('/delete-picture', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.profilePicture || !user.profilePicture.publicId) {
      return res.status(400).json({
        success: false,
        message: 'No profile picture found to delete'
      });
    }

    // Delete from Cloudinary
    try {
      await deleteImageFromCloudinary(user.profilePicture.publicId);
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
      // Continue with database update even if Cloudinary deletion fails
    }

    // Remove from user document
    user.profilePicture = {
      publicId: null,
      url: null
    };

    await user.save();

    res.json({
      success: true,
      message: 'Profile picture deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting profile picture:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting profile picture'
    });
  }
});

// Get profile picture info
router.get('/picture-info', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('profilePicture');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      profilePicture: user.profilePicture
    });

  } catch (error) {
    console.error('Error getting profile picture info:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting profile picture info'
    });
  }
});

// Test endpoint to check configuration
router.get('/test-config', verifyToken, async (req, res) => {
  try {
    const config = {
      cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing',
        apiKey: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing',
        apiSecret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing'
      },
      user: {
        id: req.user.userId,
        email: req.user.email
      }
    };

    res.json({
      success: true,
      message: 'Configuration check',
      config
    });

  } catch (error) {
    console.error('Error checking configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking configuration'
    });
  }
});

export const profileRouter = router;
