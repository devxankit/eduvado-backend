import mongoose from 'mongoose';

const returnAndRefundSchema = new mongoose.Schema({
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

// Ensure only one active return and refund policy at a time
returnAndRefundSchema.pre('save', async function(next) {
  try {
    if (this.isActive) {
    await mongoose.model('ReturnAndRefund').updateMany(
      { _id: { $ne: this._id } },
      { $set: { isActive: false } }
    );
  }
  next();
  } catch (error) {
    next(error);
  }
});

const ReturnAndRefund = mongoose.model('ReturnAndRefund', returnAndRefundSchema);
export default ReturnAndRefund;
