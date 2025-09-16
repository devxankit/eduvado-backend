import express from 'express';
import mongoose from 'mongoose';
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
    
    // If no plans exist, create default ones
    if (plans.length === 0) {
      console.log('No subscription plans found, creating default plans...');
      
      const defaultPlans = [
        {
          planType: 'monthly',
          description: 'Monthly subscription with full access to all courses',
          price: 299,
          isActive: true
        },
        {
          planType: 'quarterly',
          description: 'Quarterly subscription with full access to all courses',
          price: 799,
          isActive: true
        },
        {
          planType: 'yearly',
          description: 'Yearly subscription with full access to all courses',
          price: 2499,
          isActive: true
        }
      ];

      for (const planData of defaultPlans) {
        const plan = new SubscriptionPlan(planData);
        await plan.save();
        console.log(`Created ${planData.planType} plan: ₹${planData.price}`);
      }

      // Fetch the newly created plans
      const newPlans = await SubscriptionPlan.find({ isActive: true });
      return res.json({
        success: true,
        plans: newPlans,
        message: 'Default subscription plans created successfully'
      });
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

    console.log('=== SUBSCRIPTION CREATE DEBUG ===');
    console.log('UserId:', userId);
    console.log('PlanType:', planType);

    // Validate plan type
    if (!['monthly', 'quarterly', 'yearly'].includes(planType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type'
      });
    }

    // First, check if user has ANY subscriptions (regardless of status)
    const allUserSubscriptions = await UserSubscription.find({ userId: userId });
    console.log('All user subscriptions:', allUserSubscriptions.length);
    console.log('Subscription details:', allUserSubscriptions.map(sub => ({
      id: sub._id,
      status: sub.status,
      planType: sub.planType,
      isTrialPeriod: sub.isTrialPeriod,
      paymentStatus: sub.paymentStatus,
      createdAt: sub.createdAt
    })));

    // Check if user has an active subscription
    const existingActiveSubscription = await UserSubscription.findOne({
      userId: userId,
      status: { $in: ['trial', 'active'] }
    });

    if (existingActiveSubscription) {
      // Check if the existing subscription is actually active
      const isActive = isSubscriptionActive(existingActiveSubscription);
      console.log('Existing subscription is active:', isActive);
      
      if (isActive) {
        return res.status(400).json({
          success: false,
          message: 'You already have an active subscription',
          subscription: {
            id: existingActiveSubscription._id,
            status: existingActiveSubscription.status,
            planType: existingActiveSubscription.planType
          }
        });
      }
    }

    // Get user details
    const user = await User.findById(userId);
    console.log('User hasUsedTrial:', user.hasUsedTrial);
    console.log('User hasActiveSubscription:', user.hasActiveSubscription);

    // Check for expired trial that needs payment
    const expiredTrialSubscription = await UserSubscription.findOne({
      userId: userId,
      status: 'expired',
      paymentStatus: 'pending',
      isTrialPeriod: true
    });

    if (expiredTrialSubscription) {
      console.log('Found expired trial subscription:', expiredTrialSubscription._id);
      return res.status(400).json({
        success: false,
        message: 'Your trial period has expired. Please complete payment to continue your subscription.',
        requiresPayment: true,
        subscriptionId: expiredTrialSubscription._id,
        planType: expiredTrialSubscription.planType,
        amount: expiredTrialSubscription.amount
      });
    }

    // If user has used trial but no expired trial exists, check if they have any subscriptions at all
    if (user.hasUsedTrial && allUserSubscriptions.length === 0) {
      console.log('User has used trial but no subscriptions found - resetting hasUsedTrial flag');
      // Reset the hasUsedTrial flag if no subscriptions exist
      await User.findByIdAndUpdate(userId, { hasUsedTrial: false });
      user.hasUsedTrial = false;
    }

    // If user has already used their trial period and has subscriptions, block new trial
    if (user.hasUsedTrial && allUserSubscriptions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already used your trial period. Please subscribe to a paid plan to continue.',
        hasUsedTrial: true,
        debug: {
          userHasUsedTrial: user.hasUsedTrial,
          totalSubscriptions: allUserSubscriptions.length,
          subscriptions: allUserSubscriptions.map(sub => ({
            id: sub._id,
            status: sub.status,
            planType: sub.planType,
            isTrialPeriod: sub.isTrialPeriod
          }))
        }
      });
    }

    // Get subscription plan details
    const plan = await SubscriptionPlan.findOne({ planType, isActive: true });
    if (!plan) {
      // Check if any plans exist at all
      const allPlans = await SubscriptionPlan.find();
      console.log('=== SUBSCRIPTION PLAN DEBUG ===');
      console.log('Requested planType:', planType);
      console.log('Total plans in database:', allPlans.length);
      console.log('Available plans:', allPlans.map(p => ({ type: p.planType, active: p.isActive })));
      
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found',
        debug: {
          requestedPlanType: planType,
          totalPlansInDatabase: allPlans.length,
          availablePlans: allPlans.map(p => ({
            planType: p.planType,
            isActive: p.isActive,
            price: p.price
          }))
        }
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

    // Update user's trial status and mark that they have used their trial
    await User.findByIdAndUpdate(userId, {
      hasActiveSubscription: true,
      trialStartDate: trialStartDate,
      trialEndDate: trialEndDate,
      isTrialActive: true,
      hasUsedTrial: true
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

    // Validate subscriptionId
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID is required'
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription ID format'
      });
    }

    // Find subscription
    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      userId: userId
    }).populate('planId');

    if (!subscription) {
      // Debug: Check if subscription exists at all
      const anySubscription = await UserSubscription.findById(subscriptionId);
      const userSubscriptions = await UserSubscription.find({ userId });
      
      console.log('=== CREATE ORDER DEBUG ===');
      console.log('User ID:', userId);
      console.log('Subscription ID:', subscriptionId);
      console.log('Subscription exists:', !!anySubscription);
      console.log('User subscriptions count:', userSubscriptions.length);
      
      if (anySubscription) {
        console.log('Subscription belongs to user:', anySubscription.userId.toString() === userId.toString());
        console.log('Subscription userId:', anySubscription.userId);
        console.log('Request userId:', userId);
      }
      
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
        debug: {
          subscriptionId: subscriptionId,
          userId: userId,
          subscriptionExists: !!anySubscription,
          userSubscriptionsCount: userSubscriptions.length,
          userSubscriptions: userSubscriptions.map(sub => ({
            id: sub._id,
            status: sub.status,
            planType: sub.planType
          }))
        }
      });
    }

    // Check if payment is already completed
    if (subscription.paymentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this subscription'
      });
    }

    // Allow payment for expired trial subscriptions
    if (subscription.status === 'expired' && subscription.paymentStatus === 'pending') {
      // This is an expired trial that needs payment - allow it
    } else if (subscription.status !== 'trial' && subscription.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot create payment order for this subscription status'
      });
    }

    // Create Razorpay order
    const receipt = `ord_${subscription._id.toString().slice(-8)}_${Date.now().toString().slice(-8)}`;
    const orderResult = await createOrder(
      subscription.amount,
      'INR',
      receipt
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

// Get payment status for expired trial
router.get('/trial-payment-status', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Find expired trial subscription that needs payment
    const expiredTrialSubscription = await UserSubscription.findOne({
      userId: userId,
      status: 'expired',
      paymentStatus: 'pending',
      isTrialPeriod: true
    }).populate('planId');

    if (!expiredTrialSubscription) {
      return res.json({
        success: true,
        requiresPayment: false,
        message: 'No expired trial subscription found'
      });
    }

    const remainingDays = getRemainingDays(expiredTrialSubscription);
    const isActive = isSubscriptionActive(expiredTrialSubscription);

    res.json({
      success: true,
      requiresPayment: true,
      subscription: {
        id: expiredTrialSubscription._id,
        status: expiredTrialSubscription.status,
        planType: expiredTrialSubscription.planType,
        planDetails: expiredTrialSubscription.planId,
        amount: expiredTrialSubscription.amount,
        trialEndDate: expiredTrialSubscription.trialEndDate,
        endDate: expiredTrialSubscription.endDate,
        isActive: isActive,
        remainingDays: remainingDays,
        paymentStatus: expiredTrialSubscription.paymentStatus
      }
    });
  } catch (error) {
    console.error('Error checking trial payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking trial payment status'
    });
  }
});

// Create payment order for expired trial (seamless flow)
router.post('/create-trial-payment', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // First, check if user has used trial
    const user = await User.findById(userId);
    if (!user.hasUsedTrial) {
      return res.status(400).json({
        success: false,
        message: 'You have not used your trial period yet'
      });
    }

    // Find any trial subscription (expired or not) that needs payment
    let trialSubscription = await UserSubscription.findOne({
      userId: userId,
      isTrialPeriod: true,
      paymentStatus: 'pending'
    }).populate('planId');

    // If no trial subscription found, check if there's one that should be expired
    if (!trialSubscription) {
      trialSubscription = await UserSubscription.findOne({
        userId: userId,
        isTrialPeriod: true
      }).populate('planId');

      if (trialSubscription && !isSubscriptionActive(trialSubscription)) {
        // Update status to expired
        trialSubscription.status = 'expired';
        await trialSubscription.save();

        await User.findByIdAndUpdate(userId, {
          hasActiveSubscription: false,
          isTrialActive: false
        });
      }
    }

    if (!trialSubscription) {
      return res.status(404).json({
        success: false,
        message: 'No trial subscription found'
      });
    }

    // Check if payment is already completed
    if (trialSubscription.paymentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this subscription'
      });
    }

    // Create Razorpay order
    const receipt = `trial_${trialSubscription._id.toString().slice(-8)}_${Date.now().toString().slice(-8)}`;
    const orderResult = await createOrder(
      trialSubscription.amount,
      'INR',
      receipt
    );

    if (!orderResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Error creating payment order'
      });
    }

    // Update subscription with order ID
    trialSubscription.razorpayOrderId = orderResult.order.id;
    await trialSubscription.save();

    // Create payment record
    const payment = new Payment({
      userId: userId,
      subscriptionId: trialSubscription._id,
      planId: trialSubscription.planId._id,
      planType: trialSubscription.planType,
      amount: trialSubscription.amount,
      razorpayOrderId: orderResult.order.id,
      status: 'created'
    });

    await payment.save();

    res.json({
      success: true,
      message: 'Payment order created for trial subscription',
      order: orderResult.order,
      subscription: {
        id: trialSubscription._id,
        planType: trialSubscription.planType,
        amount: trialSubscription.amount,
        trialEndDate: trialSubscription.trialEndDate,
        endDate: trialSubscription.endDate
      }
    });
  } catch (error) {
    console.error('Error creating trial payment order:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating trial payment order'
    });
  }
});

// SIMPLIFIED SUBSCRIPTION FLOW - Single endpoint for all actions
router.post('/action', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { action, planType } = req.body;

    // Get user info
    const user = await User.findById(userId);
    
    // Find the most recent subscription
    const latestSubscription = await UserSubscription.findOne({ userId })
      .populate('planId')
      .sort({ createdAt: -1 });

    // Check for expired trial subscriptions
    let expiredTrialSubscription = await UserSubscription.findOne({
      userId: userId,
      status: 'expired',
      paymentStatus: 'pending',
      isTrialPeriod: true
    }).populate('planId');

    // If no expired trial found, check for trial subscriptions that should be expired
    if (!expiredTrialSubscription) {
      const trialSubscription = await UserSubscription.findOne({
        userId: userId,
        status: 'trial',
        isTrialPeriod: true
      }).populate('planId');

      if (trialSubscription && !isSubscriptionActive(trialSubscription)) {
        // Update status to expired
        trialSubscription.status = 'expired';
        await trialSubscription.save();

        await User.findByIdAndUpdate(userId, {
          hasActiveSubscription: false,
          isTrialActive: false
        });

        expiredTrialSubscription = trialSubscription;
      }
    }

    // Handle different actions
    switch (action) {
      case 'check_status':
        return handleCheckStatus(res, user, latestSubscription, expiredTrialSubscription);
      
      case 'start_trial':
        return handleStartTrial(res, user, planType);
      
      case 'create_payment':
        return handleCreatePayment(res, user, expiredTrialSubscription);
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Use: check_status, start_trial, or create_payment'
        });
    }

  } catch (error) {
    console.error('Error in subscription action:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing subscription action'
    });
  }
});

// Helper function to handle status check
async function handleCheckStatus(res, user, latestSubscription, expiredTrialSubscription) {
  // Prioritize expired trial subscriptions
  if (expiredTrialSubscription) {
    return res.json({
      success: true,
      status: 'trial_expired',
      message: 'Trial period has expired. Please complete payment to continue.',
      nextAction: 'create_payment',
      canCreateTrial: false,
      subscription: {
        id: expiredTrialSubscription._id,
        status: expiredTrialSubscription.status,
        planType: expiredTrialSubscription.planType,
        planDetails: expiredTrialSubscription.planId,
        amount: expiredTrialSubscription.amount,
        trialStartDate: expiredTrialSubscription.trialStartDate,
        trialEndDate: expiredTrialSubscription.trialEndDate,
        endDate: expiredTrialSubscription.endDate,
        isActive: false,
        remainingDays: 0,
        paymentStatus: expiredTrialSubscription.paymentStatus
      },
      user: {
        hasUsedTrial: user.hasUsedTrial,
        hasActiveSubscription: user.hasActiveSubscription
      }
    });
  }

  if (!latestSubscription) {
    return res.json({
      success: true,
      status: 'no_subscription',
      message: 'No subscription found',
      nextAction: user.hasUsedTrial ? 'subscribe' : 'start_trial',
      canCreateTrial: !user.hasUsedTrial,
      user: {
        hasUsedTrial: user.hasUsedTrial,
        hasActiveSubscription: user.hasActiveSubscription
      }
    });
  }

  const isActive = isSubscriptionActive(latestSubscription);
  const remainingDays = getRemainingDays(latestSubscription);

  let status, nextAction, message;

  if (latestSubscription.status === 'trial' && isActive) {
    status = 'trial_active';
    nextAction = 'wait_for_trial_end';
    message = `Trial active. ${remainingDays} days remaining.`;
  } else if (latestSubscription.status === 'active' && isActive) {
    status = 'active_paid';
    nextAction = 'none';
    message = `Active subscription. ${remainingDays} days remaining.`;
  } else {
    status = 'inactive';
    nextAction = user.hasUsedTrial ? 'subscribe' : 'start_trial';
    message = 'No active subscription.';
  }

  return res.json({
    success: true,
    status,
    nextAction,
    message,
    subscription: {
      id: latestSubscription._id,
      status: latestSubscription.status,
      planType: latestSubscription.planType,
      planDetails: latestSubscription.planId,
      amount: latestSubscription.amount,
      trialStartDate: latestSubscription.trialStartDate,
      trialEndDate: latestSubscription.trialEndDate,
      endDate: latestSubscription.endDate,
      isActive,
      remainingDays,
      paymentStatus: latestSubscription.paymentStatus
    },
    user: {
      hasUsedTrial: user.hasUsedTrial,
      hasActiveSubscription: user.hasActiveSubscription
    }
  });
}

// Helper function to handle trial start
async function handleStartTrial(res, user, planType) {
  // Validate plan type
  if (!['monthly', 'quarterly', 'yearly'].includes(planType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid plan type'
    });
  }

  // Check if user has already used trial
  if (user.hasUsedTrial) {
    return res.status(400).json({
      success: false,
      message: 'You have already used your trial period. Please subscribe to a paid plan.',
      hasUsedTrial: true
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
    userId: user._id,
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
  await User.findByIdAndUpdate(user._id, {
    hasActiveSubscription: true,
    trialStartDate: trialStartDate,
    trialEndDate: trialEndDate,
    isTrialActive: true,
    hasUsedTrial: true
  });

  return res.status(201).json({
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
}

// Helper function to handle payment creation
async function handleCreatePayment(res, user, expiredTrialSubscription) {
  if (!expiredTrialSubscription) {
    return res.status(404).json({
      success: false,
      message: 'No expired trial subscription found that requires payment'
    });
  }

  // Check if payment is already completed
  if (expiredTrialSubscription.paymentStatus === 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Payment already completed for this subscription'
    });
  }

  // Create Razorpay order
  const receipt = `exp_${expiredTrialSubscription._id.toString().slice(-8)}_${Date.now().toString().slice(-8)}`;
  const orderResult = await createOrder(
    expiredTrialSubscription.amount,
    'INR',
    receipt
  );

  if (!orderResult.success) {
    return res.status(500).json({
      success: false,
      message: 'Error creating payment order'
    });
  }

  // Update subscription with order ID
  expiredTrialSubscription.razorpayOrderId = orderResult.order.id;
  await expiredTrialSubscription.save();

  // Create payment record
  const payment = new Payment({
    userId: user._id,
    subscriptionId: expiredTrialSubscription._id,
    planId: expiredTrialSubscription.planId._id,
    planType: expiredTrialSubscription.planType,
    amount: expiredTrialSubscription.amount,
    razorpayOrderId: orderResult.order.id,
    status: 'created'
  });

  await payment.save();

  return res.json({
    success: true,
    message: 'Payment order created successfully',
    order: orderResult.order,
    subscription: {
      id: expiredTrialSubscription._id,
      planType: expiredTrialSubscription.planType,
      amount: expiredTrialSubscription.amount,
      trialEndDate: expiredTrialSubscription.trialEndDate,
      endDate: expiredTrialSubscription.endDate
    }
  });
}

// Get complete subscription status and next action (legacy endpoint)
router.get('/status', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user info
    const user = await User.findById(userId);
    
    // Find the most recent subscription
    const latestSubscription = await UserSubscription.findOne({ userId })
      .populate('planId')
      .sort({ createdAt: -1 });

    // Also check for expired trial subscriptions that need payment
    let expiredTrialSubscription = await UserSubscription.findOne({
      userId: userId,
      status: 'expired',
      paymentStatus: 'pending',
      isTrialPeriod: true
    }).populate('planId');

    // If no expired trial found, check for trial subscriptions that should be expired
    if (!expiredTrialSubscription) {
      const trialSubscription = await UserSubscription.findOne({
        userId: userId,
        status: 'trial',
        isTrialPeriod: true
      }).populate('planId');

      if (trialSubscription && !isSubscriptionActive(trialSubscription)) {
        // This trial has expired but status hasn't been updated yet
        // Update it now
        trialSubscription.status = 'expired';
        await trialSubscription.save();

        // Update user status
        await User.findByIdAndUpdate(userId, {
          hasActiveSubscription: false,
          isTrialActive: false
        });

        expiredTrialSubscription = trialSubscription;
      }
    }

    // Prioritize expired trial subscriptions that need payment
    if (expiredTrialSubscription) {
      return res.json({
        success: true,
        status: 'trial_expired',
        message: 'Trial period has expired. Please complete payment to continue.',
        nextAction: 'pay_for_subscription',
        canCreateTrial: false,
        subscription: {
          id: expiredTrialSubscription._id,
          status: expiredTrialSubscription.status,
          planType: expiredTrialSubscription.planType,
          planDetails: expiredTrialSubscription.planId,
          amount: expiredTrialSubscription.amount,
          trialStartDate: expiredTrialSubscription.trialStartDate,
          trialEndDate: expiredTrialSubscription.trialEndDate,
          endDate: expiredTrialSubscription.endDate,
          isActive: false,
          remainingDays: 0,
          paymentStatus: expiredTrialSubscription.paymentStatus
        },
        user: {
          hasUsedTrial: user.hasUsedTrial,
          hasActiveSubscription: user.hasActiveSubscription
        }
      });
    }

    if (!latestSubscription) {
      return res.json({
        success: true,
        status: 'no_subscription',
        message: 'No subscription found',
        canCreateTrial: !user.hasUsedTrial,
        nextAction: user.hasUsedTrial ? 'subscribe' : 'start_trial',
        user: {
          hasUsedTrial: user.hasUsedTrial,
          hasActiveSubscription: user.hasActiveSubscription
        }
      });
    }

    const isActive = isSubscriptionActive(latestSubscription);
    const remainingDays = getRemainingDays(latestSubscription);

    // Determine status and next action
    let status, nextAction, message;

    if (latestSubscription.status === 'trial' && isActive) {
      status = 'trial_active';
      nextAction = 'wait_for_trial_end';
      message = `Trial active. ${remainingDays} days remaining.`;
    } else if (latestSubscription.status === 'trial' && !isActive) {
      status = 'trial_expired';
      nextAction = 'pay_for_subscription';
      message = 'Trial period has expired. Please complete payment to continue.';
    } else if (latestSubscription.status === 'active' && isActive) {
      status = 'active_paid';
      nextAction = 'none';
      message = `Active subscription. ${remainingDays} days remaining.`;
    } else if (latestSubscription.status === 'expired' && latestSubscription.paymentStatus === 'pending') {
      status = 'expired_pending_payment';
      nextAction = 'pay_for_subscription';
      message = 'Subscription expired. Please complete payment to reactivate.';
    } else {
      status = 'inactive';
      nextAction = user.hasUsedTrial ? 'subscribe' : 'start_trial';
      message = 'No active subscription.';
    }

    res.json({
      success: true,
      status,
      nextAction,
      message,
      subscription: {
        id: latestSubscription._id,
        status: latestSubscription.status,
        planType: latestSubscription.planType,
        planDetails: latestSubscription.planId,
        amount: latestSubscription.amount,
        trialStartDate: latestSubscription.trialStartDate,
        trialEndDate: latestSubscription.trialEndDate,
        endDate: latestSubscription.endDate,
        isActive,
        remainingDays,
        paymentStatus: latestSubscription.paymentStatus
      },
      user: {
        hasUsedTrial: user.hasUsedTrial,
        hasActiveSubscription: user.hasActiveSubscription
      }
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting subscription status'
    });
  }
});

// Debug endpoint to check subscription status
router.get('/debug', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('=== DEBUG ENDPOINT ===');
    console.log('User ID:', userId);
    console.log('Current time:', new Date().toISOString());

    // Find all subscriptions for this user
    const allSubscriptions = await UserSubscription.find({ userId }).populate('planId');
    console.log('All subscriptions for user:', allSubscriptions.length);

    // Find active subscriptions
    const activeSubscriptions = await UserSubscription.find({
      userId: userId,
      status: { $in: ['trial', 'active'] }
    }).populate('planId');

    console.log('Active subscriptions:', activeSubscriptions.length);

    // Check for expired trials
    const expiredTrials = await UserSubscription.find({
      userId: userId,
      status: 'expired',
      paymentStatus: 'pending',
      isTrialPeriod: true
    }).populate('planId');

    console.log('Expired trials needing payment:', expiredTrials.length);

    // Check user info
    const user = await User.findById(userId);
    console.log('User hasUsedTrial:', user?.hasUsedTrial);
    console.log('User hasActiveSubscription:', user?.hasActiveSubscription);

    res.json({
      success: true,
      debug: {
        userId: userId,
        currentTime: new Date().toISOString(),
        user: {
          hasUsedTrial: user?.hasUsedTrial,
          hasActiveSubscription: user?.hasActiveSubscription,
          trialStartDate: user?.trialStartDate,
          trialEndDate: user?.trialEndDate,
          isTrialActive: user?.isTrialActive
        },
        allSubscriptionsCount: allSubscriptions.length,
        activeSubscriptionsCount: activeSubscriptions.length,
        expiredTrialsCount: expiredTrials.length,
        allSubscriptions: allSubscriptions.map(sub => ({
          id: sub._id,
          status: sub.status,
          trialEndDate: sub.trialEndDate,
          endDate: sub.endDate,
          planType: sub.planType,
          amount: sub.amount,
          paymentStatus: sub.paymentStatus,
          isTrialPeriod: sub.isTrialPeriod,
          createdAt: sub.createdAt,
          isActive: isSubscriptionActive(sub)
        })),
        activeSubscriptions: activeSubscriptions.map(sub => ({
          id: sub._id,
          status: sub.status,
          trialEndDate: sub.trialEndDate,
          endDate: sub.endDate,
          planType: sub.planType,
          isActive: isSubscriptionActive(sub)
        })),
        expiredTrials: expiredTrials.map(sub => ({
          id: sub._id,
          status: sub.status,
          trialEndDate: sub.trialEndDate,
          endDate: sub.endDate,
          planType: sub.planType,
          amount: sub.amount,
          paymentStatus: sub.paymentStatus
        }))
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error in debug endpoint',
      error: error.message
    });
  }
});

// Enhanced debug endpoint to check specific subscription ID
router.get('/debug/:subscriptionId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subscriptionId } = req.params;
    
    console.log('=== DEBUG SPECIFIC SUBSCRIPTION ===');
    console.log('User ID:', userId);
    console.log('Subscription ID:', subscriptionId);
    console.log('Is valid ObjectId:', mongoose.Types.ObjectId.isValid(subscriptionId));

    // Check if subscription exists
    const subscription = await UserSubscription.findById(subscriptionId).populate('planId');
    console.log('Subscription found:', !!subscription);
    
    if (subscription) {
      console.log('Subscription userId:', subscription.userId);
      console.log('Subscription userId type:', typeof subscription.userId);
      console.log('Request userId:', userId);
      console.log('Request userId type:', typeof userId);
      console.log('User IDs match:', subscription.userId.toString() === userId.toString());
    }

    // Check all subscriptions for this user
    const userSubscriptions = await UserSubscription.find({ userId }).populate('planId');
    console.log('All user subscriptions:', userSubscriptions.length);

    res.json({
      success: true,
      debug: {
        userId: userId,
        subscriptionId: subscriptionId,
        isValidObjectId: mongoose.Types.ObjectId.isValid(subscriptionId),
        subscriptionFound: !!subscription,
        subscription: subscription ? {
          id: subscription._id,
          userId: subscription.userId,
          status: subscription.status,
          planType: subscription.planType,
          amount: subscription.amount,
          paymentStatus: subscription.paymentStatus,
          isTrialPeriod: subscription.isTrialPeriod,
          trialStartDate: subscription.trialStartDate,
          trialEndDate: subscription.trialEndDate,
          endDate: subscription.endDate,
          createdAt: subscription.createdAt
        } : null,
        userSubscriptionsCount: userSubscriptions.length,
        userSubscriptions: userSubscriptions.map(sub => ({
          id: sub._id,
          status: sub.status,
          planType: sub.planType,
          amount: sub.amount,
          paymentStatus: sub.paymentStatus,
          isTrialPeriod: sub.isTrialPeriod
        }))
      }
    });
  } catch (error) {
    console.error('Error in debug specific subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error in debug specific subscription',
      error: error.message
    });
  }
});

export default router;
