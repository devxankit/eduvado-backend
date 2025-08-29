import mongoose from 'mongoose';

const userSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  planType: {
    type: String,
    required: true,
    enum: ['monthly', 'quarterly', 'yearly']
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['trial', 'active', 'expired', 'cancelled'],
    default: 'trial'
  },
  amount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  // Razorpay payment details
  razorpayOrderId: {
    type: String,
    default: null
  },
  razorpayPaymentId: {
    type: String,
    default: null
  },
  razorpaySignature: {
    type: String,
    default: null
  },
  // Trial period details
  isTrialPeriod: {
    type: Boolean,
    default: true
  },
  trialStartDate: {
    type: Date,
    default: Date.now
  },
  trialEndDate: {
    type: Date,
    required: true
  },
  autoRenew: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
userSubscriptionSchema.index({ userId: 1, status: 1 });
userSubscriptionSchema.index({ endDate: 1, status: 1 });
userSubscriptionSchema.index({ trialEndDate: 1, status: 1 });

// Method to check if subscription is active (including trial)
userSubscriptionSchema.methods.isActive = function() {
  const now = new Date();
  if (this.status === 'trial') {
    return now <= this.trialEndDate;
  }
  return this.status === 'active' && now <= this.endDate;
};

// Method to get remaining days
userSubscriptionSchema.methods.getRemainingDays = function() {
  const now = new Date();
  if (this.status === 'trial') {
    const remaining = this.trialEndDate - now;
    return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
  }
  const remaining = this.endDate - now;
  return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
};

const UserSubscription = mongoose.model('UserSubscription', userSubscriptionSchema);
export default UserSubscription;
