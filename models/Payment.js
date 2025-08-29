import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserSubscription',
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
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  // Razorpay details
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true
  },
  razorpayPaymentId: {
    type: String,
    default: null
  },
  razorpaySignature: {
    type: String,
    default: null
  },
  // Payment status
  status: {
    type: String,
    enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
    default: 'created'
  },
  // Payment method details
  method: {
    type: String,
    default: null
  },
  bank: {
    type: String,
    default: null
  },
  wallet: {
    type: String,
    default: null
  },
  vpa: {
    type: String,
    default: null
  },
  // Error details
  errorCode: {
    type: String,
    default: null
  },
  errorDescription: {
    type: String,
    default: null
  },
  // Timestamps
  orderCreatedAt: {
    type: Date,
    default: Date.now
  },
  paymentCapturedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ subscriptionId: 1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
