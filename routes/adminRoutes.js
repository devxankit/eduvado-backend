import express from 'express';
import Course from '../models/Course.js';
import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import UserSubscription from '../models/UserSubscription.js';
import Payment from '../models/Payment.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all courses (admin)
router.get('/courses', protect, admin, async (req, res) => {
  try {
    const courses = await Course.find({});
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new course (admin)
router.post('/courses', protect, admin, async (req, res) => {
  try {
    const { title, description, category, price, duration, image } = req.body;
    const course = await Course.create({
      title,
      description,
      category,
      price,
      duration,
      image
    });
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update course (admin)
router.put('/courses/:id', protect, admin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const { title, description, category, price, duration, image, isActive } = req.body;
    course.title = title || course.title;
    course.description = description || course.description;
    course.category = category || course.category;
    course.price = price || course.price;
    course.duration = duration || course.duration;
    course.image = image || course.image;
    course.isActive = isActive !== undefined ? isActive : course.isActive;

    const updatedCourse = await course.save();
    res.json(updatedCourse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete course (admin)
router.delete('/courses/:id', protect, admin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    await course.deleteOne();
    res.json({ message: 'Course removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users (admin)
router.get('/users', protect, admin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user role (admin)
router.put('/users/:id/role', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = req.body.role;
    const updatedUser = await user.save();
    res.json({
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all subscription plans (admin)
router.get('/subscriptions', protect, admin, async (req, res) => {
  try {
    const subscriptionPlans = await SubscriptionPlan.find({});
    res.json(subscriptionPlans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new subscription plan (admin)
router.post('/subscriptions', protect, admin, async (req, res) => {
  try {
    const { planType, description, price } = req.body;
    
    // Check if plan type already exists
    const existingPlan = await SubscriptionPlan.findOne({ planType });
    if (existingPlan) {
      return res.status(400).json({ message: 'Plan type already exists' });
    }
    
    const subscriptionPlan = await SubscriptionPlan.create({
      planType,
      description,
      price
    });
    res.status(201).json(subscriptionPlan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update subscription plan (admin)
router.put('/subscriptions/:id', protect, admin, async (req, res) => {
  try {
    const subscriptionPlan = await SubscriptionPlan.findById(req.params.id);
    if (!subscriptionPlan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    const { planType, description, price, isActive } = req.body;
    
    // Check if plan type already exists for other subscription plans
    if (planType && planType !== subscriptionPlan.planType) {
      const existingPlan = await SubscriptionPlan.findOne({ planType, _id: { $ne: req.params.id } });
      if (existingPlan) {
        return res.status(400).json({ message: 'Plan type already exists' });
      }
    }
    
    subscriptionPlan.planType = planType || subscriptionPlan.planType;
    subscriptionPlan.description = description || subscriptionPlan.description;
    subscriptionPlan.price = price || subscriptionPlan.price;
    subscriptionPlan.isActive = isActive !== undefined ? isActive : subscriptionPlan.isActive;

    const updatedSubscriptionPlan = await subscriptionPlan.save();
    res.json(updatedSubscriptionPlan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete subscription plan (admin)
router.delete('/subscriptions/:id', protect, admin, async (req, res) => {
  try {
    const subscriptionPlan = await SubscriptionPlan.findById(req.params.id);
    if (!subscriptionPlan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    await subscriptionPlan.deleteOne();
    res.json({ message: 'Subscription plan removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all user subscriptions (admin)
router.get('/user-subscriptions', protect, admin, async (req, res) => {
  try {
    const subscriptions = await UserSubscription.find({})
      .populate('userId', 'name email')
      .populate('planId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      subscriptions: subscriptions
    });
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user subscription details (admin)
router.get('/user-subscriptions/:userId', protect, admin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const subscriptions = await UserSubscription.find({ userId })
      .populate('planId')
      .sort({ createdAt: -1 });

    const user = await User.findById(userId).select('name email hasActiveSubscription isTrialActive trialStartDate trialEndDate');

    res.json({
      success: true,
      user: user,
      subscriptions: subscriptions
    });
  } catch (error) {
    console.error('Error fetching user subscription details:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all payments (admin)
router.get('/payments', protect, admin, async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate('userId', 'name email')
      .populate('planId')
      .populate('subscriptionId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments: payments
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get payment statistics (admin)
router.get('/payment-stats', protect, admin, async (req, res) => {
  try {
    const totalPayments = await Payment.countDocuments({ status: 'captured' });
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'captured' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const monthlyStats = await Payment.aggregate([
      { $match: { status: 'captured' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    const planStats = await Payment.aggregate([
      { $match: { status: 'captured' } },
      {
        $group: {
          _id: '$planType',
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalPayments,
        totalRevenue: totalRevenue[0]?.total || 0,
        monthlyStats,
        planStats
      }
    });
  } catch (error) {
    console.error('Error fetching payment statistics:', error);
    res.status(500).json({ message: error.message });
  }
});

// Manage trial period (admin)
router.put('/manage-trial/:userId', protect, admin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, days } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const subscription = await UserSubscription.findOne({
      userId: userId,
      status: 'trial'
    });

    if (!subscription) {
      return res.status(404).json({ message: 'No trial subscription found for this user' });
    }

    if (action === 'extend') {
      // Extend trial period
      const newTrialEndDate = new Date(subscription.trialEndDate);
      newTrialEndDate.setDate(newTrialEndDate.getDate() + (days || 3));
      
      subscription.trialEndDate = newTrialEndDate;
      await subscription.save();

      // Update user trial status
      user.trialEndDate = newTrialEndDate;
      await user.save();

      res.json({
        success: true,
        message: `Trial extended by ${days || 3} days`,
        newTrialEndDate: newTrialEndDate
      });
    } else if (action === 'end') {
      // End trial immediately
      subscription.trialEndDate = new Date();
      subscription.status = 'expired';
      await subscription.save();

      user.isTrialActive = false;
      user.hasActiveSubscription = false;
      await user.save();

      res.json({
        success: true,
        message: 'Trial ended immediately'
      });
    } else {
      res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error managing trial period:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get subscription analytics (admin)
router.get('/subscription-analytics', protect, admin, async (req, res) => {
  try {
    const totalSubscriptions = await UserSubscription.countDocuments();
    const activeSubscriptions = await UserSubscription.countDocuments({
      status: { $in: ['trial', 'active'] }
    });
    const trialSubscriptions = await UserSubscription.countDocuments({ status: 'trial' });
    const paidSubscriptions = await UserSubscription.countDocuments({ status: 'active' });

    const planDistribution = await UserSubscription.aggregate([
      {
        $group: {
          _id: '$planType',
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlySubscriptions = await UserSubscription.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      analytics: {
        totalSubscriptions,
        activeSubscriptions,
        trialSubscriptions,
        paidSubscriptions,
        planDistribution,
        monthlySubscriptions
      }
    });
  } catch (error) {
    console.error('Error fetching subscription analytics:', error);
    res.status(500).json({ message: error.message });
  }
});

export const adminRouter = router; 