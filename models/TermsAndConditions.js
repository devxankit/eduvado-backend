import mongoose from 'mongoose';

const termsAndConditionsSchema = new mongoose.Schema({
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

// Ensure only one active terms and conditions at a time
termsAndConditionsSchema.pre('save', async function(next) {
  try {
    if (this.isActive) {
      await mongoose.model('TermsAndConditions').updateMany(
        { _id: { $ne: this._id } },
        { $set: { isActive: false } }
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

const TermsAndConditions = mongoose.model('TermsAndConditions', termsAndConditionsSchema);
export default TermsAndConditions;
