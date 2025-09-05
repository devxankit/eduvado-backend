import UserSubscription from '../models/UserSubscription.js';
import User from '../models/User.js';
import { isSubscriptionActive } from '../helpers/razorpayHelper.js';

// Middleware to check if user has active subscription (including trial)
export const checkSubscriptionAccess = async (req, res, next) => {
  try {
    // Use _id since protect middleware sets req.user to User document
    const userId = req.user._id || req.user.userId;

    // Find user's active subscription
    const subscription = await UserSubscription.findOne({
      userId: userId,
      status: { $in: ['trial', 'active'] }
    }).populate('planId');

    if (!subscription) {
      // Check if user has an expired trial that needs payment
      const expiredTrialSubscription = await UserSubscription.findOne({
        userId: userId,
        status: 'expired',
        paymentStatus: 'pending',
        isTrialPeriod: true
      }).populate('planId');

      if (expiredTrialSubscription) {
        return res.status(403).json({
          success: false,
          message: 'Your trial period has expired. Please complete payment to continue accessing courses.',
          trialExpired: true,
          requiresPayment: true,
          subscription: {
            id: expiredTrialSubscription._id,
            status: expiredTrialSubscription.status,
            planType: expiredTrialSubscription.planType,
            amount: expiredTrialSubscription.amount,
            trialEndDate: expiredTrialSubscription.trialEndDate
          }
        });
      }

      return res.status(403).json({
        success: false,
        message: 'No active subscription found. Please subscribe to access courses.',
        requiresSubscription: true
      });
    }

    // Check if subscription is active (including trial)
    const isActive = isSubscriptionActive(subscription);
    
    if (!isActive) {
      // If trial expired, update status to expired
      if (subscription.status === 'trial' && subscription.paymentStatus === 'pending') {
        subscription.status = 'expired';
        await subscription.save();
        
        // Update user subscription status
        await User.findByIdAndUpdate(userId, {
          hasActiveSubscription: false,
          isTrialActive: false
        });

        return res.status(403).json({
          success: false,
          message: 'Your trial period has expired. Please complete payment to continue accessing courses.',
          trialExpired: true,
          requiresPayment: true,
          subscription: {
            id: subscription._id,
            status: 'expired',
            planType: subscription.planType,
            amount: subscription.amount,
            trialEndDate: subscription.trialEndDate
          }
        });
      }

      return res.status(403).json({
        success: false,
        message: 'Your subscription has expired. Please renew to continue accessing courses.',
        subscriptionExpired: true,
        subscription: {
          status: subscription.status,
          planType: subscription.planType,
          endDate: subscription.endDate,
          trialEndDate: subscription.trialEndDate
        }
      });
    }

    // Add subscription info to request
    req.subscription = subscription;
    next();
  } catch (error) {
    console.error('Error in subscription middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking subscription status'
    });
  }
};

// Middleware to check if user can enroll in courses
export const checkEnrollmentAccess = async (req, res, next) => {
  try {
    // Use _id since protect middleware sets req.user to User document
    const userId = req.user._id || req.user.userId;
    console.log('=== ENROLLMENT DEBUG ===');
    console.log('User object:', req.user);
    console.log('User ID (from _id):', req.user._id);
    console.log('User ID (from userId):', req.user.userId);
    console.log('Final User ID:', userId);
    console.log('Current time:', new Date().toISOString());

    // Find user's active subscription
    const subscription = await UserSubscription.findOne({
      userId: userId,
      status: { $in: ['trial', 'active'] }
    }).populate('planId');

    console.log('Found subscription:', subscription ? {
      id: subscription._id,
      status: subscription.status,
      trialEndDate: subscription.trialEndDate,
      endDate: subscription.endDate,
      planType: subscription.planType
    } : 'No subscription found');

    if (!subscription) {
      console.log('No subscription found - returning 403');
      return res.status(403).json({
        success: false,
        message: 'You need a subscription to enroll in courses. Please subscribe first.',
        requiresSubscription: true
      });
    }

    // Check if subscription is active
    const isActive = isSubscriptionActive(subscription);
    console.log('Is subscription active:', isActive);
    
    if (!isActive) {
      console.log('Subscription not active - returning 403');
      return res.status(403).json({
        success: false,
        message: 'Your subscription has expired. Please renew to enroll in courses.',
        subscriptionExpired: true
      });
    }

    console.log('Subscription is active - proceeding to next middleware');
    // Add subscription info to request
    req.subscription = subscription;
    next();
  } catch (error) {
    console.error('Error in enrollment middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking enrollment access'
    });
  }
};

// Middleware to get subscription status (for info purposes)
export const getSubscriptionStatus = async (req, res, next) => {
  try {
    // Use _id since protect middleware sets req.user to User document
    const userId = req.user._id || req.user.userId;

    // Find user's subscription
    const subscription = await UserSubscription.findOne({
      userId: userId
    }).populate('planId');

    if (subscription) {
      req.subscriptionStatus = {
        hasSubscription: true,
        status: subscription.status,
        planType: subscription.planType,
        isActive: isSubscriptionActive(subscription),
        endDate: subscription.endDate,
        trialEndDate: subscription.trialEndDate,
        planDetails: subscription.planId
      };
    } else {
      req.subscriptionStatus = {
        hasSubscription: false
      };
    }

    next();
  } catch (error) {
    console.error('Error getting subscription status:', error);
    req.subscriptionStatus = { hasSubscription: false };
    next();
  }
};
