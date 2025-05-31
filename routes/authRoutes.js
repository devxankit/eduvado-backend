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

    // Check if a verified user already exists with this email
    let existingUser = await User.findOne({ email, isVerified: true });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Delete any unverified user with this email
    await User.deleteOne({ email, isVerified: false });

    // Create new user
    const user = new User({
      name,
      email,
      password,
      isVerified: false,
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user
    await user.save();

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email, purpose: 'verification' });

    // Generate and save OTP
    const otp = generateOTP();
    await new OTP({
      email,
      otp,
      purpose: 'verification',
    }).save();

    // Send verification email
    await sendVerificationOTP(email, otp);

    res.status(201).json({
      message: 'Registration successful. Please check your email for verification OTP.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
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

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(400).json({ message: 'Please verify your email first' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
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

    // Update password
    const user = await User.findOne({ email });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Delete the used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
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