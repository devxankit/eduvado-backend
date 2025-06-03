import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import { generateOTP, sendVerificationOTP, sendPasswordResetOTP } from '../helpers/emailService.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Register user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log(`[Register] Attempt for email: ${email}`);

    // Check if a verified user already exists with this email
    let existingUser = await User.findOne({ email, isVerified: true });
    if (existingUser) {
      console.log(`[Register] Failed - Verified user already exists with email: ${email}`);
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Delete any unverified user with this email
    const deleteResult = await User.deleteOne({ email, isVerified: false });
    if (deleteResult.deletedCount > 0) {
      console.log(`[Register] Deleted existing unverified user with email: ${email}`);
    }

    // Create new user
    const user = new User({
      name,
      email,
      password, // Password will be hashed by the pre-save middleware
      isVerified: false,
    });

    // Save user (this will trigger the password hashing in the pre-save middleware)
    await user.save();
    console.log(`[Register] Created new user with email: ${email}`);

    // Delete any existing OTPs for this email
    const otpDeleteResult = await OTP.deleteMany({ email, purpose: 'verification' });
    if (otpDeleteResult.deletedCount > 0) {
      console.log(`[Register] Deleted ${otpDeleteResult.deletedCount} existing OTPs for email: ${email}`);
    }

    // Generate and save OTP
    const otp = generateOTP();
    await new OTP({
      email,
      otp,
      purpose: 'verification',
    }).save();
    console.log(`[Register] Generated new OTP for email: ${email}`);

    // Send verification email
    await sendVerificationOTP(email, otp);
    console.log(`[Register] Sent verification email to: ${email}`);

    res.status(201).json({
      message: 'Registration successful. Please check your email for verification OTP.',
    });
  } catch (error) {
    console.error('[Register] Error:', {
      message: error.message,
      stack: error.stack,
      email: req.body.email
    });
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Verify email with OTP
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find the OTP record
    const otpRecord = await OTP.findOne({
      email,
      otp,
      purpose: 'verification',
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Update user verification status
    await User.findOneAndUpdate({ email }, { isVerified: true });

    // Delete the used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('[Login] Request received:', {
      email,
      passwordLength: password ? password.length : 0
    });

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[Login] Failed - No account found for email: ${email}`);
      return res.status(400).json({ message: 'No account found with this email' });
    }

    console.log('[Login] User found:', {
      email: user.email,
      isVerified: user.isVerified,
      passwordHash: user.password
    });

    // Validate password using the model's matchPassword method
    const isMatch = await user.matchPassword(password);
    console.log(`[Login] Password match result: ${isMatch}`);

    if (!isMatch) {
      console.log(`[Login] Failed - Incorrect password for email: ${email}`);
      return res.status(400).json({ message: 'Incorrect password' });
    }

    // Check if email is verified
    if (!user.isVerified) {
      console.log(`[Login] Failed - Email not verified for user: ${email}`);
      return res.status(403).json({
        message: 'Email not verified. Please verify your email first.',
        requiresVerification: true,
        email: user.email
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    console.log(`[Login] Successful for user: ${email}`);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('[Login] Error:', {
      message: error.message,
      stack: error.stack,
      email: req.body?.email
    });
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Generate and save OTP
    const otp = generateOTP();
    await new OTP({
      email,
      otp,
      purpose: 'password_reset',
    }).save();

    // Send password reset email
    await sendPasswordResetOTP(email, otp);

    res.json({ message: 'Password reset OTP sent to your email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password with OTP
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Verify OTP
    const otpRecord = await OTP.findOne({
      email,
      otp,
      purpose: 'password_reset',
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Update password - let the pre-save middleware handle the hashing
    const user = await User.findOne({ email });
    user.password = newPassword;  // The pre-save middleware will hash this
    await user.save();

    // Delete the used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('[Reset Password] Error:', {
      message: error.message,
      stack: error.stack,
      email: req.body.email
    });
    res.status(500).json({ message: 'Server error' });
  }
});

// Resend verification OTP
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists and is not verified
    const user = await User.findOne({ email, isVerified: false });
    if (!user) {
      return res.status(400).json({ message: 'Invalid request or user already verified' });
    }

    // Delete any existing OTP
    await OTP.deleteMany({ email, purpose: 'verification' });

    // Generate and save new OTP
    const otp = generateOTP();
    await new OTP({
      email,
      otp,
      purpose: 'verification',
    }).save();

    // Send verification email
    await sendVerificationOTP(email, otp);

    res.json({ message: 'Verification OTP resent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email && email !== user.email) {
      // If email is being changed, require re-verification
      user.email = email;
      user.isVerified = false;
      
      // Send verification OTP to new email
      const otp = generateOTP();
      await new OTP({
        email,
        otp,
        purpose: 'verification',
      }).save();
      
      await sendVerificationOTP(email, otp);
    }

    await user.save();
    res.json({ 
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export const authRouter = router; 