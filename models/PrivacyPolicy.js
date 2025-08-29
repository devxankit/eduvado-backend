import mongoose from 'mongoose';

const privacyPolicySchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  version: {
    type: String,
    required: true,
    default: '1.0'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure only one active privacy policy at a time
privacyPolicySchema.pre('save', async function(next) {
  try {
    if (this.isActive) {
      await mongoose.model('PrivacyPolicy').updateMany(
        { _id: { $ne: this._id } },
        { $set: { isActive: false } }
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

const PrivacyPolicy = mongoose.model('PrivacyPolicy', privacyPolicySchema);
export default PrivacyPolicy;
