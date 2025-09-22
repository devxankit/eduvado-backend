import express from 'express';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';
import { uploadProfilePicture } from '../middleware/upload.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../helpers/cloudinaryHelper.js';
import cloudinary from '../helpers/cloudinaryHelper.js';

const router = express.Router();

// Upload/Update Profile Picture
router.post('/upload-picture', verifyToken, uploadProfilePicture, async (req, res) => {
  try {
    console.log('📤 Profile picture upload started');
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select an image file.'
      });
    }

    // Get user from database
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store old profile picture info for cleanup
    const oldProfilePicture = user.profilePicture;

    // Upload to Cloudinary with timeout
    console.log('☁️ Uploading to Cloudinary...');
    
    // Add timeout to prevent hanging
    const uploadPromise = uploadToCloudinary(req.file.buffer, 'eduvado/profile-pictures', req.file.mimetype);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000);
    });
    
    const result = await Promise.race([uploadPromise, timeoutPromise]);

    // Update user profile picture
    user.profilePicture = {
      publicId: result.public_id,
      url: result.secure_url
    };

    // Save user
    await user.save();
    console.log('✅ Profile picture saved to database');

    // Delete old profile picture from Cloudinary (if exists)
    if (oldProfilePicture && oldProfilePicture.publicId) {
      try {
        await deleteFromCloudinary(oldProfilePicture.publicId);
        console.log('🗑️ Old profile picture deleted');
      } catch (error) {
        console.error('⚠️ Error deleting old profile picture:', error.message);
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
    console.error('❌ Profile picture upload error:', error);
    
    // Handle specific error types
    let errorMessage = 'Error uploading profile picture';
    let statusCode = 500;
    
    // Safely access error message
    const errorMsg = error?.message || error?.error?.message || 'Unknown error';
    
    if (errorMsg.toLowerCase().includes('timeout')) {
      errorMessage = 'Upload timeout. Please try again with a smaller image (under 5MB).';
      statusCode = 408;
    } else if (errorMsg.toLowerCase().includes('invalid image')) {
      errorMessage = 'Invalid image file. Please try a different image.';
      statusCode = 400;
    } else if (errorMsg.toLowerCase().includes('file too large')) {
      errorMessage = 'Image file is too large. Maximum size is 5MB. Please compress the image.';
      statusCode = 413;
    } else if (error?.error?.http_code === 499) {
      errorMessage = 'Upload timeout. Please try again with a smaller image (under 5MB).';
      statusCode = 408;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? errorMsg : undefined
    });
  }
});

// Get Profile Picture
router.get('/picture', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('profilePicture');
    
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
    console.error('❌ Error getting profile picture:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting profile picture'
    });
  }
});

// Delete Profile Picture
router.delete('/picture', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
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
      await deleteFromCloudinary(user.profilePicture.publicId);
    } catch (error) {
      console.error('⚠️ Error deleting from Cloudinary:', error.message);
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
    console.error('❌ Error deleting profile picture:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting profile picture'
    });
  }
});

// Get User Profile (including profile picture)
router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('❌ Error getting user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user profile'
    });
  }
});

// Update User Profile (excluding profile picture)
router.put('/', verifyToken, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update allowed fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
});

// Test endpoint to check configuration
router.get('/test', verifyToken, async (req, res) => {
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

    // Test Cloudinary connection
    let cloudinaryTest = 'Not tested';
    try {
      const testResult = await cloudinary.api.ping();
      cloudinaryTest = testResult.status === 'ok' ? 'Connected' : 'Failed';
    } catch (error) {
      cloudinaryTest = `Error: ${error.message}`;
    }

    res.json({
      success: true,
      message: 'Profile API is working',
      config,
      cloudinaryTest
    });

  } catch (error) {
    console.error('❌ Error in test endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error in test endpoint'
    });
  }
});

export default router;
