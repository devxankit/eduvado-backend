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
  getRemainingDays,
  validatePaymentAmount,
  formatAmount,
  getSubscriptionStatus,
  isSubscriptionExpired,
  canCreatePayment
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

    // Find expired trial subscription that needs payment
    const subscriptionNeedingPayment = await UserSubscription.findOne({
      userId: userId,
      status: 'expired',
      paymentStatus: 'pending',
      isTrialPeriod: true
    }).sort({ createdAt: -1 });

    if (!subscriptionNeedingPayment) {
      return res.status(404).json({
        success: false,
        message: 'No expired trial subscription found that requires payment. Please complete your trial period first.',
        debug: {
          userId,
          totalSubscriptions: await UserSubscription.countDocuments({ userId })
        }
      });
    }

    // Validate if payment can be created for this subscription
    const paymentValidation = canCreatePayment(subscriptionNeedingPayment);
    
    if (!paymentValidation.canPay) {
      return res.status(400).json({
        success: false,
        message: paymentValidation.reason,
        trialEndDate: paymentValidation.trialEndDate,
        remainingDays: paymentValidation.remainingDays
      });
    }

    console.log('Found subscription needing payment:', subscriptionNeedingPayment._id);
    console.log('Subscription amount:', subscriptionNeedingPayment.amount);
    console.log('Subscription planType:', subscriptionNeedingPayment.planType);

    // Validate payment amount
    const isValidAmount = validatePaymentAmount(subscriptionNeedingPayment.amount, subscriptionNeedingPayment.planType);
    console.log('Payment amount validation result:', isValidAmount);
    
    if (!isValidAmount) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment amount for the selected plan',
        debug: {
          amount: subscriptionNeedingPayment.amount,
          planType: subscriptionNeedingPayment.planType,
          expectedAmounts: {
            monthly: 99,
            quarterly: 499,
            yearly: 899
          }
        }
      });
    }

    // Check if there's already a pending payment for this subscription
    const existingPayment = await Payment.findOne({
      subscriptionId: subscriptionNeedingPayment._id,
      status: { $in: ['created', 'authorized'] }
    });

    console.log('Existing payment check:', existingPayment ? 'Found existing payment' : 'No existing payment');

    if (existingPayment) {
      console.log('Existing payment details:', {
        id: existingPayment._id,
        razorpayOrderId: existingPayment.razorpayOrderId,
        status: existingPayment.status
      });
      return res.status(400).json({
        success: false,
        message: 'Payment order already exists for this subscription',
        existingOrder: {
          id: existingPayment.razorpayOrderId,
          status: existingPayment.status
        }
      });
    }

    // Create Razorpay order
    const receipt = `sub_${subscriptionNeedingPayment._id.toString().slice(-8)}_${Date.now().toString().slice(-8)}`;
    console.log('About to create Razorpay order with:', {
      amount: subscriptionNeedingPayment.amount,
      currency: 'INR',
      receipt: receipt
    });
    
    const orderResult = await createOrder(
      subscriptionNeedingPayment.amount,
      'INR',
      receipt
    );
    
    console.log('Razorpay order result:', orderResult);

    if (!orderResult.success) {
      console.error('Razorpay order creation failed:', orderResult.error);
      return res.status(500).json({
        success: false,
        message: orderResult.error || 'Error creating payment order',
        error: orderResult.error,
        debug: {
          amount: subscriptionNeedingPayment.amount,
          planType: subscriptionNeedingPayment.planType,
          subscriptionId: subscriptionNeedingPayment._id
        }
      });
    }

    const order = orderResult.order;
    console.log('Razorpay order created:', order.id);

    // Update subscription with order ID
    subscriptionNeedingPayment.razorpayOrderId = order.id;
    await subscriptionNeedingPayment.save();

    // Create payment record
    const payment = new Payment({
      userId: userId,
      subscriptionId: subscriptionNeedingPayment._id,
      planId: subscriptionNeedingPayment.planId,
      planType: subscriptionNeedingPayment.planType,
      amount: subscriptionNeedingPayment.amount,
      razorpayOrderId: order.id,
      status: 'created'
    });

    await payment.save();

    res.json({
      success: true,
      message: 'Payment order created successfully',
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status
      },
      subscription: {
        id: subscriptionNeedingPayment._id,
        planType: subscriptionNeedingPayment.planType,
        amount: subscriptionNeedingPayment.amount,
        formattedAmount: formatAmount(subscriptionNeedingPayment.amount)
      }
    });

  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    // Validate required fields
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields'
      });
    }

    // Verify payment with Razorpay
    const verificationResult = verifyPayment(orderId, paymentId, signature);
    
    if (!verificationResult.success || !verificationResult.isAuthentic) {
      console.error('Payment verification failed:', verificationResult);
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed - invalid signature'
      });
    }

    // Find the subscription by order ID
    const subscription = await UserSubscription.findOne({
      userId: userId,
      razorpayOrderId: orderId
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found for this payment order'
      });
    }

    // Check if payment is already processed
    if (subscription.paymentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment has already been processed for this subscription'
      });
    }

    // Update subscription status
    subscription.status = 'active';
    subscription.paymentStatus = 'completed';
    subscription.razorpayPaymentId = paymentId;
    subscription.razorpaySignature = signature;
    subscription.isTrialPeriod = false;
    
    // Update start date to current time for active subscription
    subscription.startDate = new Date();
    subscription.endDate = calculateSubscriptionEndDate(subscription.planType, subscription.startDate);
    
    await subscription.save();

    // Update user status
    await User.findByIdAndUpdate(userId, {
      hasActiveSubscription: true,
      isTrialActive: false
    });

    // Update existing payment record
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: orderId },
      {
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        status: 'captured',
        paymentCapturedAt: new Date()
      },
      { new: true }
    );

    if (!payment) {
      console.warn('Payment record not found for order:', orderId);
    }

    console.log('Payment verified and subscription activated successfully');

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
        formattedAmount: formatAmount(subscription.amount),
        paymentStatus: subscription.paymentStatus,
        remainingDays: getRemainingDays(subscription)
      },
      payment: {
        id: payment?._id,
        orderId: orderId,
        paymentId: paymentId,
        status: 'captured'
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Manual subscription status update (for testing/admin)
router.post('/update-status', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('=== MANUAL STATUS UPDATE ===');
    console.log('UserId:', userId);

    // Get all user subscriptions
    const subscriptions = await UserSubscription.find({ userId });
    
    let updatedCount = 0;
    
    for (const subscription of subscriptions) {
      const currentStatus = getSubscriptionStatus(subscription);
      
      if (currentStatus !== subscription.status) {
        console.log(`Updating subscription ${subscription._id} from ${subscription.status} to ${currentStatus}`);
        
        subscription.status = currentStatus;
        
        if (currentStatus === 'expired' && subscription.isTrialPeriod) {
          subscription.paymentStatus = 'pending';
        }
        
        await subscription.save();
        updatedCount++;
      }
    }

    // Update user flags
    const user = await User.findById(userId);
    const hasActiveSubscription = subscriptions.some(sub => 
      sub.status === 'active' || (sub.status === 'trial' && !isSubscriptionExpired(sub))
    );
    const hasTrialSubscription = subscriptions.some(sub => 
      sub.status === 'trial' && !isSubscriptionExpired(sub)
    );
    const hasUsedTrial = subscriptions.some(sub => sub.isTrialPeriod);

    await User.findByIdAndUpdate(userId, {
      hasActiveSubscription,
      isTrialActive: hasTrialSubscription,
      hasUsedTrial
    });

    res.json({
      success: true,
      message: 'Subscription status updated successfully',
      updatedSubscriptions: updatedCount,
      userFlags: {
        hasActiveSubscription,
        isTrialActive: hasTrialSubscription,
        hasUsedTrial
      }
    });

  } catch (error) {
    console.error('Error updating subscription status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating subscription status'
    });
  }
});

// Get payment history for user
router.get('/payment-history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const payments = await Payment.find({ userId })
      .sort({ createdAt: -1 })
      .populate('subscriptionId', 'planType status')
      .populate('planId', 'planType description price');

    res.json({
      success: true,
      payments: payments.map(payment => ({
        id: payment._id,
        amount: payment.amount,
        formattedAmount: formatAmount(payment.amount),
        currency: payment.currency,
        status: payment.status,
        planType: payment.planType,
        orderId: payment.razorpayOrderId,
        paymentId: payment.razorpayPaymentId,
        createdAt: payment.createdAt,
        paymentCapturedAt: payment.paymentCapturedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment history'
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
