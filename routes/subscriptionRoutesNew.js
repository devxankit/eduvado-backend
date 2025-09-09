import express from 'express';
import mongoose from 'mongoose';
import { verifyToken } from '../middleware/auth.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import UserSubscription from '../models/UserSubscription.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { 
  createOrder, 
  verifyPayment, 
  calculateSubscriptionEndDate,
  calculateTrialEndDate,
  isSubscriptionActive,
  getRemainingDays
} from '../helpers/razorpayHelper.js';

const router = express.Router();

// ========================================
// SIMPLIFIED SUBSCRIPTION FLOW
// ========================================

// Get available subscription plans
router.get('/plans', async (req, res) => {
  try {
    let plans = await SubscriptionPlan.find({ isActive: true });
    
    // If no plans exist, create default ones
    if (plans.length === 0) {
      console.log('No subscription plans found, creating default plans...');
      
      const defaultPlans = [
        {
          planType: 'monthly',
          description: 'Monthly subscription with full access to all courses',
          price: 99,
          isActive: true
        },
        {
          planType: 'quarterly',
          description: 'Quarterly subscription with full access to all courses',
          price: 299,
          isActive: true
        },
        {
          planType: 'yearly',
          description: 'Yearly subscription with full access to all courses',
          price: 999,
          isActive: true
        }
      ];

      for (const planData of defaultPlans) {
        const plan = new SubscriptionPlan(planData);
        await plan.save();
        console.log(`Created ${planData.planType} plan: ₹${planData.price}`);
      }

      plans = await SubscriptionPlan.find({ isActive: true });
    }

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
router.get('/status', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('=== SUBSCRIPTION STATUS DEBUG ===');
    console.log('UserId:', userId);

    // Get all user subscriptions
    const allSubscriptions = await UserSubscription.find({ userId }).sort({ createdAt: -1 });
    console.log('Total subscriptions found:', allSubscriptions.length);

    // Get user details
    const user = await User.findById(userId);
    console.log('User hasUsedTrial:', user.hasUsedTrial);

    // Check for active subscription
    let activeSubscription = null;
    for (const sub of allSubscriptions) {
      if (isSubscriptionActive(sub)) {
        activeSubscription = sub;
        break;
      }
    }

    // Check for expired trial that needs payment
    const expiredTrialSubscription = allSubscriptions.find(sub => 
      sub.status === 'expired' && 
      sub.paymentStatus === 'pending' && 
      sub.isTrialPeriod === true
    );

    // Determine status and next action
    let status = 'no_subscription';
    let nextAction = 'start_trial';
    let subscription = null;

    if (activeSubscription) {
      if (activeSubscription.status === 'trial') {
        status = 'trial_active';
        nextAction = 'wait_for_trial_end';
        subscription = activeSubscription;
      } else if (activeSubscription.status === 'active') {
        status = 'active';
        nextAction = 'none';
        subscription = activeSubscription;
      }
    } else if (expiredTrialSubscription) {
      status = 'trial_expired';
      nextAction = 'create_payment';
      subscription = expiredTrialSubscription;
    } else if (user.hasUsedTrial && allSubscriptions.length > 0) {
      status = 'trial_used';
      nextAction = 'subscribe_paid';
    } else {
      status = 'no_subscription';
      nextAction = 'start_trial';
    }

    // Reset hasUsedTrial if no subscriptions exist
    if (user.hasUsedTrial && allSubscriptions.length === 0) {
      console.log('Resetting hasUsedTrial flag - no subscriptions found');
      await User.findByIdAndUpdate(userId, { hasUsedTrial: false });
    }

    const response = {
      success: true,
      status,
      nextAction,
      canCreateTrial: !user.hasUsedTrial || allSubscriptions.length === 0,
      debug: {
        userId,
        userHasUsedTrial: user.hasUsedTrial,
        totalSubscriptions: allSubscriptions.length,
        subscriptions: allSubscriptions.map(sub => ({
          id: sub._id,
          status: sub.status,
          planType: sub.planType,
          isTrialPeriod: sub.isTrialPeriod,
          paymentStatus: sub.paymentStatus,
          isActive: isSubscriptionActive(sub)
        }))
      }
    };

    if (subscription) {
      response.subscription = {
        id: subscription._id,
        status: subscription.status,
        planType: subscription.planType,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        trialStartDate: subscription.trialStartDate,
        trialEndDate: subscription.trialEndDate,
        amount: subscription.amount,
        paymentStatus: subscription.paymentStatus,
        remainingDays: getRemainingDays(subscription)
      };
    }

    console.log('Status response:', response);
    res.json(response);

  } catch (error) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking subscription status'
    });
  }
});

// Start trial subscription
router.post('/start-trial', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { planType } = req.body;

    console.log('=== START TRIAL DEBUG ===');
    console.log('UserId:', userId);
    console.log('PlanType:', planType);

    // Validate plan type
    if (!['monthly', 'quarterly', 'yearly'].includes(planType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type'
      });
    }

    // Check current status first
    const statusResponse = await checkUserStatus(userId);
    console.log('Current user status:', statusResponse);

    if (statusResponse.hasActiveSubscription) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription',
        subscription: statusResponse.activeSubscription
      });
    }

    if (statusResponse.hasUsedTrial && statusResponse.totalSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already used your trial period',
        debug: statusResponse
      });
    }

    // Get subscription plan
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

    // Create subscription
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
      isTrialPeriod: true,
      autoRenew: false
    });

    await subscription.save();
    console.log('Trial subscription created:', subscription._id);

    // Update user's trial status
    await User.findByIdAndUpdate(userId, {
      hasUsedTrial: true,
      hasActiveSubscription: true,
      isTrialActive: true,
      trialStartDate: trialStartDate,
      trialEndDate: trialEndDate
    });

    res.json({
      success: true,
      message: 'Trial subscription started successfully',
      subscription: {
        id: subscription._id,
        status: subscription.status,
        planType: subscription.planType,
        trialStartDate: subscription.trialStartDate,
        trialEndDate: subscription.trialEndDate,
        amount: subscription.amount,
        remainingDays: getRemainingDays(subscription)
      }
    });

  } catch (error) {
    console.error('Error starting trial:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting trial subscription'
    });
  }
});

// Create payment order for expired trial
router.post('/create-payment', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('=== CREATE PAYMENT DEBUG ===');
    console.log('UserId:', userId);

    // Find expired trial subscription
    const expiredTrialSubscription = await UserSubscription.findOne({
      userId: userId,
      status: 'expired',
      paymentStatus: 'pending',
      isTrialPeriod: true
    });

    if (!expiredTrialSubscription) {
      return res.status(404).json({
        success: false,
        message: 'No expired trial subscription found that requires payment',
        debug: {
          userId,
          totalSubscriptions: await UserSubscription.countDocuments({ userId })
        }
      });
    }

    console.log('Found expired trial subscription:', expiredTrialSubscription._id);

    // Create Razorpay order
    const orderResult = await createOrder(
      expiredTrialSubscription.amount,
      'INR',
      `subscription_${expiredTrialSubscription._id}`
    );

    if (!orderResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Error creating payment order',
        error: orderResult.error
      });
    }

    const order = orderResult.order;
    console.log('Razorpay order created:', order.id);

    // Update subscription with order ID
    expiredTrialSubscription.razorpayOrderId = order.id;
    await expiredTrialSubscription.save();

    // Create payment record
    const payment = new Payment({
      userId: userId,
      subscriptionId: expiredTrialSubscription._id,
      planId: expiredTrialSubscription.planId,
      planType: expiredTrialSubscription.planType,
      amount: expiredTrialSubscription.amount,
      razorpayOrderId: order.id,
      status: 'created'
    });

    await payment.save();

    res.json({
      success: true,
      message: 'Payment order created successfully',
      order: order,
      subscription: {
        id: expiredTrialSubscription._id,
        planType: expiredTrialSubscription.planType,
        amount: expiredTrialSubscription.amount
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
    const { orderId, paymentId, signature } = req.body;

    console.log('=== VERIFY PAYMENT DEBUG ===');
    console.log('UserId:', userId);
    console.log('OrderId:', orderId);
    console.log('PaymentId:', paymentId);

    // Verify payment with Razorpay
    const verificationResult = verifyPayment(orderId, paymentId, signature);
    
    if (!verificationResult.success || !verificationResult.isAuthentic) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Find the subscription
    const subscription = await UserSubscription.findOne({
      userId: userId,
      paymentStatus: 'pending'
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No pending subscription found'
      });
    }

    // Update subscription status
    subscription.status = 'active';
    subscription.paymentStatus = 'completed';
    subscription.razorpayPaymentId = paymentId;
    subscription.razorpaySignature = signature;
    subscription.isTrialPeriod = false;
    await subscription.save();

    // Update user status
    await User.findByIdAndUpdate(userId, {
      hasActiveSubscription: true,
      isTrialActive: false
    });

    // Update existing payment record
    await Payment.findOneAndUpdate(
      { razorpayOrderId: orderId },
      {
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        status: 'captured',
        paymentCapturedAt: new Date()
      }
    );

    console.log('Payment verified and subscription activated');

    res.json({
      success: true,
      message: 'Payment verified and subscription activated successfully',
      subscription: {
        id: subscription._id,
        status: subscription.status,
        planType: subscription.planType,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        amount: subscription.amount,
        paymentStatus: subscription.paymentStatus
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

// Helper function to check user status
async function checkUserStatus(userId) {
  const allSubscriptions = await UserSubscription.find({ userId });
  const user = await User.findById(userId);
  
  let activeSubscription = null;
  for (const sub of allSubscriptions) {
    if (isSubscriptionActive(sub)) {
      activeSubscription = sub;
      break;
    }
  }

  return {
    hasActiveSubscription: !!activeSubscription,
    activeSubscription,
    hasUsedTrial: user.hasUsedTrial,
    totalSubscriptions: allSubscriptions.length,
    subscriptions: allSubscriptions
  };
}

export default router;
