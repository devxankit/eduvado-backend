import express from 'express';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';
import { uploadProfilePicture, handleUploadError, checkFileUpload } from '../middleware/uploadMiddleware.js';
import { deleteImageFromCloudinary } from '../helpers/cloudinaryHelper.js';

const router = express.Router();

// Upload profile picture
router.post('/upload-picture', 
  verifyToken, 
  uploadProfilePicture, 
  handleUploadError, 
  checkFileUpload,
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Delete old profile picture if exists
      if (user.profilePicture && user.profilePicture.publicId) {
        try {
          await deleteImageFromCloudinary(user.profilePicture.publicId);
        } catch (error) {
          console.error('Error deleting old profile picture:', error);
          // Continue with upload even if deletion fails
        }
      }

      // Update user with new profile picture
      user.profilePicture = {
        publicId: req.file.public_id,
        url: req.file.secure_url
      };

      await user.save();

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
        message: 'Error uploading profile picture'
      });
    }
  }
);

// Update profile picture (same as upload, replaces existing)
router.put('/update-picture', 
  verifyToken, 
  uploadProfilePicture, 
  handleUploadError, 
  checkFileUpload,
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Delete old profile picture if exists
      if (user.profilePicture && user.profilePicture.publicId) {
        try {
          await deleteImageFromCloudinary(user.profilePicture.publicId);
        } catch (error) {
          console.error('Error deleting old profile picture:', error);
          // Continue with upload even if deletion fails
        }
      }

      // Update user with new profile picture
      user.profilePicture = {
        publicId: req.file.public_id,
        url: req.file.secure_url
      };

      await user.save();

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
        message: 'Error updating profile picture'
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

export const profileRouter = router;
