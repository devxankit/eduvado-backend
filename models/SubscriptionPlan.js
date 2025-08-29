import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema({
  planType: {
    type: String,
    required: true,
    enum: ['monthly', 'quarterly', 'yearly'],
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
export default SubscriptionPlan;
