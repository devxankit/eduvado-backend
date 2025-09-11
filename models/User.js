import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // Subscription related fields
  hasActiveSubscription: {
    type: Boolean,
    default: false
  },
  trialStartDate: {
    type: Date,
    default: null
  },
  trialEndDate: {
    type: Date,
    default: null
  },
  isTrialActive: {
    type: Boolean,
    default: false
  },
  hasUsedTrial: {
    type: Boolean,
    default: false
  },
  // Profile picture fields
  profilePicture: {
    publicId: {
      type: String,
      default: null
    },
    url: {
      type: String,
      default: null
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    console.log('[matchPassword] Debug info:');
    console.log('[matchPassword] Entered password:', enteredPassword);
    console.log('[matchPassword] Stored hashed password:', this.password);
    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    console.log(`[matchPassword] Comparison result: ${isMatch}`);
    return isMatch;
  } catch (error) {
    console.error('[matchPassword] Error during comparison:', error);
    throw error;
  }
};

const User = mongoose.model('User', userSchema);
export default User; 