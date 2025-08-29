import UserSubscription from '../models/UserSubscription.js';
import { isSubscriptionActive } from '../helpers/razorpayHelper.js';

// Middleware to check if user has active subscription (including trial)
export const checkSubscriptionAccess = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Find user's active subscription
    const subscription = await UserSubscription.findOne({
      userId: userId,
      status: { $in: ['trial', 'active'] }
    }).populate('planId');

    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: 'No active subscription found. Please subscribe to access courses.',
        requiresSubscription: true
      });
    }

    // Check if subscription is active (including trial)
    const isActive = isSubscriptionActive(subscription);
    
    if (!isActive) {
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
    const userId = req.user.userId;

    // Find user's active subscription
    const subscription = await UserSubscription.findOne({
      userId: userId,
      status: { $in: ['trial', 'active'] }
    }).populate('planId');

    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: 'You need a subscription to enroll in courses. Please subscribe first.',
        requiresSubscription: true
      });
    }

    // Check if subscription is active
    const isActive = isSubscriptionActive(subscription);
    
    if (!isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription has expired. Please renew to enroll in courses.',
        subscriptionExpired: true
      });
    }

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
    const userId = req.user.userId;

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
