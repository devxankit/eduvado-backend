import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { checkSubscriptionAccess, getSubscriptionStatus } from '../middleware/subscriptionMiddleware.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import UserSubscription from '../models/UserSubscription.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { 
  createOrder, 
  verifyPayment, 
  getPaymentDetails,
  calculateSubscriptionEndDate,
  calculateTrialEndDate,
  isSubscriptionActive,
  getRemainingDays
} from '../helpers/razorpayHelper.js';

const router = express.Router();

// Get available subscription plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true });
    res.json({
      success: true,
      plans: plans
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription plans'
    });
  }
});

// Get user's subscription status
router.get('/my-subscription', verifyToken, getSubscriptionStatus, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const subscription = await UserSubscription.findOne({ userId })
      .populate('planId')
      .sort({ createdAt: -1 });

    if (!subscription) {
      return res.json({
        success: true,
        hasSubscription: false,
        message: 'No subscription found'
      });
    }

    const remainingDays = getRemainingDays(subscription);
    const isActive = isSubscriptionActive(subscription);

    res.json({
      success: true,
      hasSubscription: true,
      subscription: {
        id: subscription._id,
        status: subscription.status,
        planType: subscription.planType,
        planDetails: subscription.planId,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        trialStartDate: subscription.trialStartDate,
        trialEndDate: subscription.trialEndDate,
        isActive: isActive,
        remainingDays: remainingDays,
        amount: subscription.amount,
        paymentStatus: subscription.paymentStatus
      }
    });
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription details'
    });
  }
});

// Create subscription (starts trial period)
router.post('/create', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { planType } = req.body;

    // Validate plan type
    if (!['monthly', 'quarterly', 'yearly'].includes(planType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type'
      });
    }

    // Check if user already has an active subscription
    const existingSubscription = await UserSubscription.findOne({
      userId: userId,
      status: { $in: ['trial', 'active'] }
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription'
      });
    }

    // Get subscription plan details
    const plan = await SubscriptionPlan.findOne({ planType, isActive: true });
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    // Calculate dates
    const trialStartDate = new Date();
    const trialEndDate = calculateTrialEndDate(trialStartDate);
    const subscriptionEndDate = calculateSubscriptionEndDate(planType, trialEndDate);

    // Create subscription with trial period
    const subscription = new UserSubscription({
      userId: userId,
      planId: plan._id,
      planType: planType,
      startDate: trialStartDate,
      endDate: subscriptionEndDate,
      status: 'trial',
      amount: plan.price,
      paymentStatus: 'pending',
      trialStartDate: trialStartDate,
      trialEndDate: trialEndDate,
      isTrialPeriod: true
    });

    await subscription.save();

    // Update user's trial status
    await User.findByIdAndUpdate(userId, {
      hasActiveSubscription: true,
      trialStartDate: trialStartDate,
      trialEndDate: trialEndDate,
      isTrialActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Trial subscription created successfully',
      subscription: {
        id: subscription._id,
        status: subscription.status,
        planType: subscription.planType,
        trialStartDate: subscription.trialStartDate,
        trialEndDate: subscription.trialEndDate,
        remainingDays: getRemainingDays(subscription)
      }
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating subscription'
    });
  }
});

// Create Razorpay order for payment
router.post('/create-order', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subscriptionId } = req.body;

    // Find subscription
    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      userId: userId
    }).populate('planId');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Check if payment is already completed
    if (subscription.paymentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this subscription'
      });
    }

    // Create Razorpay order
    const orderResult = await createOrder(
      subscription.amount,
      'INR',
      `order_${subscription._id}_${Date.now()}`
    );

    if (!orderResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Error creating payment order'
      });
    }

    // Update subscription with order ID
    subscription.razorpayOrderId = orderResult.order.id;
    await subscription.save();

    // Create payment record
    const payment = new Payment({
      userId: userId,
      subscriptionId: subscription._id,
      planId: subscription.planId._id,
      planType: subscription.planType,
      amount: subscription.amount,
      razorpayOrderId: orderResult.order.id,
      status: 'created'
    });

    await payment.save();

    res.json({
      success: true,
      order: orderResult.order,
      subscription: {
        id: subscription._id,
        planType: subscription.planType,
        amount: subscription.amount
      }
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment order'
    });
  }
});

// Verify payment and activate subscription
router.post('/verify-payment', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subscriptionId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Find subscription
    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      userId: userId
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Verify payment signature
    const verificationResult = verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    
    if (!verificationResult.success || !verificationResult.isAuthentic) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Get payment details from Razorpay
    const paymentDetails = await getPaymentDetails(razorpayPaymentId);
    
    if (!paymentDetails.success) {
      return res.status(400).json({
        success: false,
        message: 'Error fetching payment details'
      });
    }

    // Update subscription
    subscription.status = 'active';
    subscription.paymentStatus = 'completed';
    subscription.razorpayPaymentId = razorpayPaymentId;
    subscription.razorpaySignature = razorpaySignature;
    subscription.isTrialPeriod = false;
    await subscription.save();

    // Update payment record
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpayOrderId },
      {
        razorpayPaymentId: razorpayPaymentId,
        razorpaySignature: razorpaySignature,
        status: 'captured',
        paymentCapturedAt: new Date(),
        method: paymentDetails.payment.method,
        bank: paymentDetails.payment.bank,
        wallet: paymentDetails.payment.wallet,
        vpa: paymentDetails.payment.vpa
      }
    );

    // Update user subscription status
    await User.findByIdAndUpdate(userId, {
      hasActiveSubscription: true,
      isTrialActive: false
    });

    res.json({
      success: true,
      message: 'Payment verified and subscription activated successfully',
      subscription: {
        id: subscription._id,
        status: subscription.status,
        planType: subscription.planType,
        endDate: subscription.endDate,
        remainingDays: getRemainingDays(subscription)
      }
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment'
    });
  }
});

// Cancel subscription
router.post('/cancel', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subscriptionId } = req.body;

    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      userId: userId
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    subscription.status = 'cancelled';
    await subscription.save();

    // Update user subscription status
    await User.findByIdAndUpdate(userId, {
      hasActiveSubscription: false,
      isTrialActive: false
    });

    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling subscription'
    });
  }
});

// Get payment history
router.get('/payments', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const payments = await Payment.find({ userId })
      .populate('planId')
      .populate('subscriptionId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments: payments
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment history'
    });
  }
});

export default router;
